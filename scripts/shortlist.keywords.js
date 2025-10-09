// CommonJS
const DEFAULT_K = 12;

/**
 * @returns {Array<{name:string, definition:string}>}
 */
function shortlist({ title, description, labelBook, k = DEFAULT_K }) {
  const hay = `${title||""} ${description||""}`.toLowerCase();
  const scored = [];
  for (const u of (labelBook.umbrellas || [])) {
    const keys = new Set();
    (u.name||"").toLowerCase().split(/\s+/).forEach(w => w && keys.add(w));
    (u.aliases||[]).forEach(a => (a||"").toLowerCase().split(/\s+/).forEach(w => w && keys.add(w)));
    let s = 0;
    const phrases = [u.name, ...(u.aliases||[])].filter(Boolean).map(x => x.toLowerCase());
    for (const p of phrases) if (hay.includes(p)) s += Math.min(2.0, p.split(/\s+/).length);
    for (const kw of keys) if (new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,'i').test(hay)) s += 1;
    if (s > 0) scored.push({ name: u.name, definition: u.definition, score: s });
  }
  if (scored.length < 6) {
    const fallbacks = ["Technology","News","Lifestyle","Entertainment","Gaming","Education"];
    for (const f of fallbacks) {
      const u = (labelBook.umbrellas||[]).find(x => x.name.toLowerCase() === f.toLowerCase());
      if (u && !scored.find(x => x.name === u.name)) scored.push({ name:u.name, definition:u.definition, score: 0.1 });
    }
  }
  scored.sort((a,b) => b.score - a.score);
  return scored.slice(0, k).map(({name, definition}) => ({name, definition}));
}
module.exports = { shortlist };
