const hoursOld = (iso) => (Date.now() - new Date(iso).getTime()) / 36e5;

export function scorePost(post, config) {
  const age = hoursOld(post.updated);
  if (!(age >= 0) || age > config.maxPostAgeHours) return null;

  const title = post.title.toLowerCase();
  const text = `${post.title}\n${post.body}`.toLowerCase();
  if (config.blockPhrases.some((p) => text.includes(p))) return null;

  const hits = [];
  let kw = 0;
  for (const [word, weight] of Object.entries(config.keywords)) {
    const re = new RegExp(`(^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
    if (re.test(title)) { kw += weight * 2; hits.push(word); }
    else if (re.test(text)) { kw += weight; hits.push(word); }
  }
  if (kw === 0) return null;

  // Early is best: full marks under 2h, fading to 0 at maxPostAgeHours.
  const recency = age <= 2 ? 1 : Math.max(0, 1 - (age - 2) / (config.maxPostAgeHours - 2));
  const asks = /\?|feedback|thoughts|advice|help|roast|review/i.test(post.title) ? 1.25 : 1;
  const len = post.body.length;
  const substance = len < 40 ? 0.6 : len > 150 ? 1 : 0.85;
  const sub = config.subreddits.find((s) => s.name === post.subreddit)?.weight ?? 1;

  const score = Math.min(kw, 14) * (0.4 + 0.6 * recency) * asks * substance * sub;
  return { ...post, score: Math.round(score * 10) / 10, ageHours: Math.round(age * 10) / 10, hits };
}

// Product Hunt launches have no "feedback please" wording, so score the tagline for B2B-product signals instead.
export function scoreLaunch(post, cfg) {
  const age = hoursOld(post.updated);
  if (!(age >= 0) || age > cfg.maxPostAgeHours) return null;
  const text = `${post.title} ${post.body}`.toLowerCase();
  if (cfg.blockWords.some((w) => text.includes(w))) return null;
  const hits = Object.keys(cfg.keywords).filter((w) => text.includes(w));
  if (!hits.length) return null;
  const kw = hits.reduce((n, w) => n + cfg.keywords[w], 0);
  const recency = Math.max(0.3, 1 - age / cfg.maxPostAgeHours);
  return { ...post, score: Math.round(Math.min(kw, 10) * recency * 10) / 10, ageHours: Math.round(age * 10) / 10, hits };
}
