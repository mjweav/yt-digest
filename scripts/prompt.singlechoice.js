/**
 * Dynamic prompt builder for single-choice classification
 * - inserts actual shortlist + definitions
 * - merges anchor examples if available
 * - optional --showPrompt=1 prints one sample prompt
 */

const fs = require("fs");

function buildPrompt({ channel, shortlist, anchors = [], showPrompt = false }) {
  const { title, description } = channel;
  const anchorMap = new Map();
  for (const a of anchors) anchorMap.set(a.label, a.example);

  const choices = shortlist
    .map((x, i) => {
      const a = anchorMap.get(x.label);
      const ex = a ? ` Example: ${a}` : "";
      return `${i + 1}. ${x.label} — ${x.def}.${ex}`;
    })
    .join("\n");

  const system = `You are a YouTube content analyst. Choose exactly one label from the shortlist below that best fits the channel. Output JSON only.`;
  const user = `
Channel:
Title: ${title}
Description: ${description}

Shortlist:
${choices}

Respond in JSON:
{"label": "...", "confidence": 0-1, "knowledge_source": "world_knowledge"|"text_clues", "evidence": "short justification"}
`;

  if (showPrompt) {
    console.log("=== Sample Prompt Preview ===\n", user.slice(0, 1000));
  }

  return { system, user };
}

module.exports = { buildPrompt };
