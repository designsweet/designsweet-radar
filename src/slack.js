import { platformLabel, sourceLabel } from './platforms.js';

export async function postDigest(webhook, items, searchLinks = []) {
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `Radar: ${items.length} posts worth a reply` } },
  ];
  let platform;
  for (const p of items) {
    if (p.platform !== platform) {
      platform = p.platform;
      blocks.push({ type: 'header', text: { type: 'plain_text', text: platformLabel(platform || 'reddit') } });
    }
    const potential = p.draft ? `potential ${p.draft.potential}/10 · ` : '';
    let text = `*<${p.url}|${p.title.slice(0, 120)}>*\n${potential}${sourceLabel(p)} · ${p.ageHours}h old`;
    if (p.draft) {
      text += `\n_${p.draft.why}_`;
      p.draft.options.forEach((o, i) => { text += `\n*${'AB'[i]}:* ${o}`; });
    }
    blocks.push({ type: 'divider' }, { type: 'section', text: { type: 'mrkdwn', text } });
  }
  if (searchLinks.length) {
    blocks.push({ type: 'divider' }, { type: 'header', text: { type: 'plain_text', text: 'Manual scan: tap to search' } });
    const text = searchLinks.map((g) => `*${g.label}*\n${g.links.map((l) => `<${l.url}|${l.label}>`).join('  ·  ')}`).join('\n');
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text } });
  }
  // Slack allows 50 blocks per message; digestSize keeps us well under.
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'Reddit radar digest', blocks }),
  });
  if (!res.ok) throw new Error(`Slack webhook ${res.status}`);
}
