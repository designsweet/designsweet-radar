const UA = 'designsweet-radar/0.1 (personal use; RSS reader)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const decode = (s) =>
  s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&');

const htmlToText = (html) =>
  decode(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[link\]|\[comments\]|submitted by\s+\/u\/\S+/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();

function parseAtom(xml, subreddit) {
  const posts = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    const pick = (re) => (e.match(re) || [])[1] || '';
    const url = pick(/<link[^>]*href="([^"]+)"/);
    posts.push({
      id: pick(/<id>([^<]+)<\/id>/),
      subreddit,
      title: decode(pick(/<title[^>]*>([\s\S]*?)<\/title>/)),
      author: pick(/<author>\s*<name>([^<]+)<\/name>/),
      url,
      updated: pick(/<updated>([^<]+)<\/updated>/),
      body: htmlToText(pick(/<content[^>]*>([\s\S]*?)<\/content>/)).slice(0, 1500),
    });
  }
  return posts;
}

export async function fetchSubreddit(name) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(`https://www.reddit.com/r/${name}/new/.rss?limit=40`, {
      headers: { 'User-Agent': UA },
    });
    if (res.ok) return parseAtom(await res.text(), name);
    if (res.status !== 429 || attempt === 4) throw new Error(`r/${name}: HTTP ${res.status}`);
    const wait = Number(res.headers.get('retry-after')) || 10 * attempt;
    await sleep(wait * 1000);
  }
}

export async function fetchAll(subreddits) {
  const all = [];
  const errors = [];
  for (const { name } of subreddits) {
    try {
      all.push(...(await fetchSubreddit(name)));
    } catch (err) {
      errors.push(err.message);
    }
    await sleep(5000); // unauthenticated RSS rate-limits quickly
  }
  return { posts: all, errors };
}
