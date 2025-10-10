/**
 * Prompt builder (single-choice)
 * - Inserts dynamic shortlist + definitions
 * - Encourages use of BOTH text clues and world knowledge
 * - Forces canonical label return (exactly one, must match provided labels)
 */

function buildPrompt({ channel, shortlist, anchors = [], showPrompt = false }) {
  const { title = "", description = "" } = channel;
  const anchorMap = new Map();
  for (const a of anchors) anchorMap.set(a.label, a.example);

  const labelsOnly = shortlist.map(x => x.label);
  const choices = shortlist
    .map((x, i) => {
      const a = anchorMap.get(x.label);
      const ex = a ? ` Example: ${a}` : "";
      return `${x.id} — ${x.label} — ${x.def || ""}${ex}`.trim();
    })
    .join("\n");

  const system = `You are a precise YouTube content analyst.
Use BOTH:
• world knowledge (famous people, outlets, bands, shows, brands, etc.)
• text clues in the channel title/description.
Choose EXACTLY ONE ID from the shortlist. Output STRICT JSON matching the schema.`;

  // Machine-readable guard: IDs array provided explicitly
  const idsOnly = shortlist.map(x => x.id);
  const user = `
Channel:
Title: ${title}
Description: ${description}

Shortlist (human readable):
${choices}

Shortlist (IDs array, machine-readable):
${JSON.stringify(idsOnly)}

Respond in JSON ONLY with this schema:
{"choice_id": "<one of the IDs exactly as given above>",
 "confidence": <0..1>,
 "knowledge_source": "world_knowledge" | "text_clues" | "both",
 "evidence": "<short justification>"}
`;

  if (showPrompt) {
    console.log("=== Sample Prompt Preview ===\n", user.slice(0, 1200));
  }

  return { system, user };
}

module.exports = { buildPrompt };
