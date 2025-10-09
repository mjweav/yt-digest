// CommonJS
function trimText(s, n){ if(!s) return ""; const t=s.replace(/\s+/g," ").trim(); return t.length>n?t.slice(0,n):t; }

/**
 * @returns {{system:string, user:string}}
 */
function buildPrompt({ channel, shortlist, anchors = [] }) {
  const system = [
    "You classify YouTube channels into exactly one high-level umbrella topic.",
    "Use both the provided text AND your general world knowledge of creators, organizations, brands, and shows.",
    "Choose exactly ONE label from the CANDIDATES list. Do not invent labels.",
    "Prefer the most general label that best fits the channel’s PRIMARY theme.",
    "If multiple fit, break ties: (1) subject matter core, (2) sustained focus, (3) more general umbrella.",
    "Return STRICT JSON ONLY: {\"label\":\"<one_of_candidates>\",\"confidence\":0.0-1.0,\"knowledge_source\":\"world_knowledge|text_clues\",\"evidence\":\"<=100 chars\"}"
  ].join("\n");

  const lines = [];
  lines.push(`CHANNEL_TITLE: ${trimText(channel.title||"", 300)}`);
  lines.push(`CHANNEL_DESCRIPTION: ${trimText(channel.description||"", 1200)}`);
  lines.push("");
  lines.push("CANDIDATES (choose exactly one):");
  shortlist.slice(0,12).forEach(c => lines.push(`- ${c.name} — ${c.definition}`));
  if (anchors && anchors.length) {
    lines.push("");
    lines.push("ANCHOR EXEMPLARS (for consistency; ignore if not helpful):");
    anchors.slice(0,6).forEach(a => lines.push(`- ${a.label}: "${trimText(a.example, 100)}"`));
  }
  return { system, user: lines.join("\n") };
}
module.exports = { buildPrompt };
