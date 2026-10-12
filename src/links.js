// Free "manual scan" search links for platforms we can't scan automatically (X, LinkedIn, Indie Hackers).
const enc = encodeURIComponent;

const BUILDERS = {
  x: (q) => `https://x.com/search?q=${enc(`${q} -filter:replies`)}&src=typed_query&f=live`,
  linkedin: (q) => `https://www.linkedin.com/search/results/content/?keywords=${enc(q)}&datePosted=${enc('"past-24h"')}&sortBy=${enc('"date_posted"')}`,
  // Indie Hackers blocks bots and has no search URL we can rely on, so use Google limited to the past day.
  indiehackers: (q) => `https://www.google.com/search?q=${enc(`site:indiehackers.com ${q}`)}&tbs=qdr:d`,
};

export const LINK_PLATFORMS = { x: 'X', linkedin: 'LinkedIn', indiehackers: 'Indie Hackers' };

// Returns [{ platform, label, links: [{ label, url }] }] for the platforms present in config.searchLinks.
export function buildSearchLinks(searchLinks = []) {
  return Object.keys(LINK_PLATFORMS)
    .map((platform) => ({
      platform,
      label: LINK_PLATFORMS[platform],
      links: searchLinks.filter((s) => s[platform]).map((s) => ({ label: s.label, url: BUILDERS[platform](s[platform]) })),
    }))
    .filter((g) => g.links.length);
}
