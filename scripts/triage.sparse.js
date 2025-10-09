// CommonJS
const ENTITY_ALLOWLIST = new Set([
  "msnbc","cnn","bbc","espn","nba","nfl","minecraft","fortnite",
  "apple","android","iphone","davinci resolve","premiere pro","blender",
  "adobe","tiktok","disney","marvel","uefa","fifa"
]);

function tokenize(s){return (s||"").toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(Boolean);}

/** @returns {{isSparse:boolean, reason:string}} */
function triageSparse({ title, description }) {
  const t = tokenize(title), d = tokenize(description);
  const hasEntity = [...ENTITY_ALLOWLIST].some(e => (title||"").toLowerCase().includes(e) || (description||"").toLowerCase().includes(e));
  const isSparse = (t.length < 4 && d.length < 12) && !hasEntity;
  return { isSparse, reason: isSparse ? "sparse_title_and_description" : "" };
}
module.exports = { triageSparse };
