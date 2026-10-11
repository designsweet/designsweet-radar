import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fetchAll } from './reddit.js';
import { scorePost } from './score.js';
import { draftReplies, draftingAvailable } from './draft.js';
import { postDigest } from './slack.js';
import { buildDashboard } from './dashboard.js';

const config = JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf8'));
const dataDir = new URL('../data/', import.meta.url);
const seenPath = new URL('seen.json', dataDir);
const noDraft = process.argv.includes('--no-draft') || !draftingAvailable(config.draft);
const dry = process.argv.includes('--dry');
const noSlack = process.argv.includes('--no-slack') || !process.env.SLACK_WEBHOOK_URL;

const seen = new Set(existsSync(seenPath) ? JSON.parse(readFileSync(seenPath, 'utf8')) : []);

const { posts, errors } = await fetchAll(config.subreddits);
console.log(`Fetched ${posts.length} posts from ${config.subreddits.length} subreddits.`);
errors.forEach((e) => console.warn('  warning:', e));

const ranked = posts
  .filter((p) => !seen.has(p.id))
  .map((p) => scorePost(p, config))
  .filter(Boolean)
  .sort((a, b) => b.score - a.score)
  .slice(0, config.digestSize);

if (!noDraft) {
  for (const p of ranked) {
    try { p.draft = await draftReplies(p, config.draft); }
    catch (err) { console.warn(`  draft failed for "${p.title.slice(0, 40)}": ${err.message}`); }
  }
}

for (const p of ranked) {
  console.log(`\n[${p.score}] r/${p.subreddit} · ${p.ageHours}h · ${p.title}\n  ${p.url}\n  matched: ${p.hits.join(', ')}`);
  if (p.draft) {
    console.log(`  why: ${p.draft.why}`);
    p.draft.options.forEach((o, i) => console.log(`  ${'AB'[i]}: ${o}`));
  }
}
if (!ranked.length) console.log('Nothing new worth replying to right now.');

if (!noSlack && ranked.length) {
  await postDigest(process.env.SLACK_WEBHOOK_URL, ranked);
  console.log('\nPosted digest to Slack.');
}

if (dry) process.exit(0); // dry runs don't mark posts as seen

ranked.forEach((p) => seen.add(p.id));
writeFileSync(seenPath, JSON.stringify([...seen].slice(-2000)));
writeFileSync(new URL(`digest-${new Date().toISOString().slice(0, 10)}.json`, dataDir), JSON.stringify(ranked, null, 2));
buildDashboard(dataDir);
