import { readFileSync } from 'node:fs';

const voice = readFileSync(new URL('../voice.md', import.meta.url), 'utf8');
const stripDashes = (s) => s.replace(/\s*[—–]\s*/g, ', ');

const PROVIDERS = {
  kimi: { key: 'MOONSHOT_API_KEY', url: 'https://api.moonshot.ai/v1/chat/completions' },
  anthropic: { key: 'ANTHROPIC_API_KEY', url: 'https://api.anthropic.com/v1/messages' },
};

export const draftingAvailable = (draft) => Boolean(process.env[PROVIDERS[draft.provider]?.key]);

const instructions = () =>
  `You ghostwrite short, genuinely helpful Reddit replies for Ryan. Follow this voice guide exactly:\n\n${voice}\n\n` +
  `Return JSON only: {"why": "<one line on why this post is worth replying to>", "options": ["<reply A>", "<reply B>"]}. ` +
  `The two options should take different angles (e.g. one specific fix, one sharp question).`;

async function callModel(draft, userText) {
  const { key, url } = PROVIDERS[draft.provider];
  const model = draft.models[draft.provider];
  const apiKey = process.env[key];
  const isAnthropic = draft.provider === 'anthropic';
  const request = () => fetch(url, {
    method: 'POST',
    headers: isAnthropic
      ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }
      : { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(
      isAnthropic
        ? { model, max_tokens: 500, system: instructions(), messages: [{ role: 'user', content: userText }] }
        // Kimi (OpenAI-compatible). Generous max_tokens in case the model emits reasoning first.
        : { model, max_tokens: 2000, reasoning_effort: 'low', messages: [{ role: 'system', content: instructions() }, { role: 'user', content: userText }] },
    ),
  });
  // New Kimi accounts are limited to 3 requests/min, so wait out 429s and retry.
  let res = await request();
  for (let attempt = 0; res.status === 429 && attempt < 5; attempt++) {
    await new Promise((r) => setTimeout(r, 21000));
    res = await request();
  }
  if (!res.ok) throw new Error(`${draft.provider} API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return isAnthropic
    ? data.content?.find((b) => b.type === 'text')?.text ?? ''
    : data.choices?.[0]?.message?.content ?? '';
}

export async function draftReplies(post, draft) {
  const raw = await callModel(draft, `Subreddit: r/${post.subreddit}\nTitle: ${post.title}\n\n${post.body}`);
  const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  return { why: stripDashes(parsed.why), options: parsed.options.map(stripDashes) };
}
