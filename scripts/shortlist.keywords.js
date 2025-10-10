/**
 * Dynamic shortlist builder with backfill
 * - uses all umbrellas (incl. children) from labelbook
 * - indexes aliases + names
 * - scores by keyword hits
 * - backfills to k with generic/popular umbrellas if underfilled
 */

function shortlist({ title, description, labelBook, k = 12, backfill = [] }) {
  const text = `${title || ""} ${description || ""}`.toLowerCase();
  const tokens = text.split(/\W+/).filter(Boolean);
  const wordSet = new Set(tokens);

  const all = [];
  for (const u of (labelBook.umbrellas || labelBook)) {
    const names = [u.name.toLowerCase(), ...(u.aliases || []).map(a => a.toLowerCase())];
    all.push({ ...u, names });
  }

  const scored = [];
  for (const u of all) {
    let score = 0;
    for (const n of u.names) {
      const parts = n.split(/\s+/);
      if (parts.some(p => wordSet.has(p))) score += 1;
      if (text.includes(n)) score += 2; // phrase match
    }
    if (u.parents && u.parents.length) {
      for (const p of u.parents) if (text.includes(String(p).toLowerCase())) score += 1.5;
    }
    if (score > 0) scored.push({ label: u.name, def: u.definition, score });
  }

  let ranked = scored.sort((a, b) => b.score - a.score).slice(0, k);

  // Backfill with popular/generic umbrellas if we're short
  if (ranked.length < k && backfill && backfill.length) {
    const need = k - ranked.length;
    const have = new Set(ranked.map(x => x.label));
    for (const b of backfill) {
      if (have.has(b.label)) continue;
      ranked.push({ label: b.label, def: b.def || "", score: 0 });
      if (ranked.length >= k) break;
    }
  }

  if (ranked.length < 8) {
    console.warn(`⚠️ shortlist underfilled (${ranked.length}/${k}) for "${(title || '').slice(0,60)}..."`);
  }

  return ranked;
}

module.exports = { shortlist };
