import { platformLabel, sourceLabel } from './platforms.js';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Posts are already ordered (platform, then potential) in the digest file; group them, tagging old posts as Reddit.
const groupByPlatform = (posts) => {
  const groups = new Map();
  for (const p of posts) {
    const k = p.platform || 'reddit';
    groups.set(k, [...(groups.get(k) || []), p]);
  }
  return [...groups];
};

export function buildDashboard(dataDir, searchLinks = []) {
  const days = readdirSync(dataDir)
    .filter((f) => /^digest-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .reverse()
    .map((f) => ({ date: f.slice(7, 17), posts: JSON.parse(readFileSync(new URL(f, dataDir), 'utf8')) }));

  const post = (p) => `
    <article>
      <div class="meta">${p.draft?.potential ? `<b>potential ${esc(p.draft.potential)}/10</b> · ` : ''}${esc(sourceLabel(p))} · ${esc(p.ageHours)}h old · matched: ${esc((p.hits || []).join(', '))}</div>
      <h3><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a></h3>
      ${p.draft ? `<p class="why">${esc(p.draft.why)}</p>` + p.draft.options.map((o, i) => `
      <div class="reply"><span>${'AB'[i] || i + 1}</span><p>${esc(o)}</p><button onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent);this.textContent='Copied'">Copy</button></div>`).join('') : ''}
    </article>`;

  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DesignSweet Radar</title>
<style>
body{font:15px/1.5 -apple-system,system-ui,sans-serif;max-width:820px;margin:32px auto;padding:0 16px;color:#1a1a1a}
h1{margin-bottom:0}h2{margin-top:40px;border-bottom:1px solid #ddd;padding-bottom:4px}
article{border:1px solid #e3e3e3;border-radius:8px;padding:12px 16px;margin:12px 0}
h3{margin:4px 0}.chips{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 12px}.chips a{padding:10px 14px;border:1px solid #ccc;border-radius:20px;text-decoration:none;color:#1a1a1a}h3.platform{margin:24px 0 4px;font-size:18px;color:#444}.meta{color:#777;font-size:13px}.why{color:#555;font-style:italic}
.reply{display:flex;gap:10px;align-items:flex-start;background:#f6f6f6;border-radius:6px;padding:8px 10px;margin:6px 0}
.reply span{font-weight:700}.reply p{margin:0;flex:1}button{cursor:pointer;padding:10px 14px;font-size:15px;border-radius:6px;border:1px solid #ccc;background:#fff}@media(max-width:600px){.reply{flex-direction:column}.reply button{width:100%}}
</style>
<h1>DesignSweet Radar</h1><p class="meta">Updated ${esc(new Date().toLocaleString())}</p>
${searchLinks.length ? `<section class="links"><h2>Manual scan: tap to search</h2>${searchLinks.map((g) => `<p><b>${esc(g.label)}</b></p><p class="chips">${g.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')}</p>`).join('')}</section>` : ''}
${days.map((d) => `<h2>${esc(d.date)} <small>(${d.posts.length} posts)</small></h2>${groupByPlatform(d.posts).map(([pl, ps]) => `<h3 class="platform">${esc(platformLabel(pl))}</h3>${ps.map(post).join('')}`).join('')}`).join('') || '<p>No scans yet.</p>'}`;

  // GitHub Pages serves from /docs
  const out = new URL('../docs/', dataDir);
  mkdirSync(out, { recursive: true });
  writeFileSync(new URL('index.html', out), html);
}
