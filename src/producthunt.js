const UA = 'designsweet-radar/0.1 (personal use; RSS reader)';
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&');

// Public Atom feed of newest launches: product name, tagline, maker and link only.
export async function fetchProductHunt() {
  const res = await fetch('https://www.producthunt.com/feed', { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Product Hunt: HTTP ${res.status}`);
  const xml = await res.text();
  const posts = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    const pick = (re) => (e.match(re) || [])[1] || '';
    const tagline = decode(pick(/<content[^>]*>([\s\S]*?)<\/content>/))
      .replace(/<p>\s*<a[\s\S]*$/i, '') // drop the "Discussion | Link" footer
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    posts.push({
      id: pick(/<id>([^<]+)<\/id>/),
      platform: 'producthunt',
      title: decode(pick(/<title[^>]*>([\s\S]*?)<\/title>/)),
      author: pick(/<author>\s*<name>([^<]+)<\/name>/),
      url: pick(/<link[^>]*href="([^"]+)"/),
      updated: pick(/<published>([^<]+)<\/published>/), // `updated` changes on every edit
      body: tagline,
    });
  }
  return posts;
}
