// CommonJS
const REQUIRED_KEYS = ["name","definition","id"];
const OPTIONAL_KEYS = ["inclusion","exclusion","aliases","examples","parents"];

/**
 * Validate a labelbook structure.
 * @param {object} lb - {version, umbrellas:[{name,definition,inclusion?,exclusion?,aliases?,examples?,parents?}]}
 * @returns {{ok:boolean, errors:string[]}}
 */
function validateLabelBook(lb) {
  const errors = [];
  if (!lb || typeof lb !== 'object') return { ok:false, errors:["labelBook is not an object"] };
  if (!Array.isArray(lb.umbrellas) || lb.umbrellas.length === 0) {
    errors.push("labelBook.umbrellas must be a non-empty array");
  } else {
    lb.umbrellas.forEach((u, i) => {
      for (const k of REQUIRED_KEYS) {
        if (!u[k] || typeof u[k] !== 'string') errors.push(`umbrellas[${i}].${k} is required and must be a string`);
      }
      const known = new Set([...REQUIRED_KEYS, ...OPTIONAL_KEYS]);
      Object.keys(u).forEach(k => { if (!known.has(k)) errors.push(`umbrellas[${i}] unknown key: ${k}`); });
      if (Array.isArray(u.aliases)) u.aliases.forEach((a, j)=>{ if (typeof a!=='string') errors.push(`umbrellas[${i}].aliases[${j}] must be string`); });
      if (Array.isArray(u.examples)) u.examples.forEach((a, j)=>{ if (typeof a!=='string') errors.push(`umbrellas[${i}].examples[${j}] must be string`); });
    });
  }
  return { ok: errors.length === 0, errors };
}
module.exports = { validateLabelBook };
