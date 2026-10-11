export async function postDigest(webhook, items) {
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `Reddit radar: ${items.length} posts worth a reply` } },
  ];
  for (const p of items) {
    let text = `*<${p.url}|${p.title.slice(0, 120)}>*\nr/${p.subreddit} · ${p.ageHours}h old · score ${p.score}`;
    if (p.draft) {
      text += `\n_${p.draft.why}_`;
      p.draft.options.forEach((o, i) => { text += `\n*${'AB'[i]}:* ${o}`; });
    }
    blocks.push({ type: 'divider' }, { type: 'section', text: { type: 'mrkdwn', text } });
  }
  // Slack allows 50 blocks per message; digestSize keeps us well under.
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'Reddit radar digest', blocks }),
  });
  if (!res.ok) throw new Error(`Slack webhook ${res.status}`);
}
