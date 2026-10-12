export const PLATFORM_LABELS = { reddit: 'Reddit', producthunt: 'Product Hunt', indiehackers: 'Indie Hackers' };
export const platformLabel = (id) => PLATFORM_LABELS[id] ?? id;
// Where a post lives, e.g. "r/SaaS" on Reddit.
export const sourceLabel = (p) => (p.platform === 'reddit' || !p.platform ? `r/${p.subreddit}` : p.subreddit || platformLabel(p.platform));
