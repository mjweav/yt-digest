
// scripts/ai_helper.js
// Use built-in fetch for Node.js 18+
let fetch;
try {
  fetch = globalThis.fetch || require('node-fetch');
} catch (e) {
  fetch = require('node-fetch');
}

const OPENAI_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

async function aiDisambiguate({ title, description, candidates = [], maxLabels = 3 }) {
  if (!OPENAI_KEY) {
    return { labels: [], reason: 'ai_skipped_no_key' };
  }

  if (candidates.length === 0 && (!title && !description)) {
    return { labels: [], reason: 'ai_skipped_no_content' };
  }

  const hasCandidates = candidates.length > 0;
  const sys = `You label YouTube channels with 1-3 word generic topics.
${hasCandidates ? `- Choose up to ${maxLabels} labels from the provided candidate list only.` : `- Generate up to ${maxLabels} appropriate 1-3 word generic topic labels based on the content.`}
- If unsure, return [].
- Consider both title and description context.
Return JSON: {"labels":["..."]}.`;

  const user = `TITLE: ${title || ''}
DESCRIPTION: ${description || ''}
CANDIDATES: ${candidates.join(', ')}`;

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user }
        ]
      })
    });

    if (!res.ok) {
      const txt = await res.text();
      return { labels: [], reason: `ai_error:${res.status}:${txt.slice(0, 200)}` };
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    const labels = Array.isArray(parsed.labels) ? parsed.labels.slice(0, maxLabels) : [];
    return { labels, reason: 'ai_used' };
  } catch (e) {
    return { labels: [], reason: `ai_exception:${e.message}` };
  }
}

module.exports = { aiDisambiguate };
