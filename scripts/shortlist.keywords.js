/**
 * Dynamic shortlist builder
 * - loads every umbrella (including children) from labelbook
 * - indexes aliases + names
 * - returns up to k best matches
 */

const fs = require("fs");

function shortlist({ title, description, labelBook, k = 12 }) {
  const text = `${title} ${description}`.toLowerCase();
  const tokens = text.split(/\W+/).filter(Boolean);
  const wordSet = new Set(tokens);

  // Build flat alias map
  const all = [];
  for (const u of (labelBook.umbrellas || [])) {
    const names = [u.name.toLowerCase(), ...(u.aliases || []).map(a => a.toLowerCase())];
    all.push({ ...u, names });
  }

  // Score by keyword hits
  const scored = [];
  for (const u of all) {
    let score = 0;
    for (const n of u.names) {
      const parts = n.split(/\s+/);
      if (parts.some(p => wordSet.has(p))) score += 1;
      if (text.includes(n)) score += 2; // phrase hit
    }
    // parent/child relation bonus
    if (u.parents && u.parents.length) {
      for (const p of u.parents) if (text.includes(p.toLowerCase())) score += 1.5;
    }
    if (score > 0) scored.push({ label: u.name, def: u.definition, score });
  }

  // Sort + slice
  const ranked = scored.sort((a, b) => b.score - a.score).slice(0, k);

  if (ranked.length < 8) {
    console.warn(`⚠️ shortlist underfilled (${ranked.length}/${k}) for "${title.slice(0,60)}..."`);
  }

  return ranked;
}

module.exports = { shortlist };
