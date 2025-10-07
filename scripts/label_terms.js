// scripts/label_terms.js (CommonJS)
const STOPWORDS = new Set([
  "the","a","an","and","or","but","if","then","else","for","to","of","in","on","at","by","with",
  "from","as","is","are","was","were","be","been","being","it","its","this","that","those","these",
  "we","you","they","i","me","my","your","our","their","them","us",
  "new","official","channel","video","videos","subscribe","watch","welcome","about","more","info",
  "how","why","what","when","where","can","will","just","get","make","made","using","use","tips",
  "free","best","top","latest","daily","weekly","month","year","world","global","news","update","updates"
]);
const GENERICS = new Set(["video","learn","tutorial","guide","content","create","creator","official","series","episode","ep"]);
const ALIAS_LABELS = [
  { re: /(premiere|after\s*effects|resolve|davinci|fcpx|final\s*cut|editor|editing)/i, label: "Video Editing" },
  { re: /(camera|lens|lightroom|bokeh|sony\s*alpha|raw\b|photograph)/i, label: "Photography" },
  { re: /\b(ai|gpt|llm|prompt|machine\s*learning|deep\s*learn)/i, label: "AI" },
  { re: /(guitar|drum|bass|piano|singer|band|mix|record\b|studio\b|vic\s*firth|doctor\s*mix)/i, label: "Music" },
  { re: /(woodworking|jointer|planer|bandsaw|lathe|dovetail|mortis|tenon|chisel|hardwood|plywood|cnc)/i, label: "Woodworking" },
  { re: /(drywall|plumbing|hvac|thermostat|outlet|breaker|stud\s*finder|caulk|grout|solder|flux)/i, label: "Home Repair" },
  { re: /(framing|rebar|joist|rafter|concrete|masonry|formwork|footing|anchor\s*bolt|osb|sheathing)/i, label: "Construction" },
  { re: /(3d\s*print|pla|petg|abs|stl|gcode|slicer|nozzle|extruder|prusa|ender|marlin|klipper|sketchup)/i, label: "3D Printing" },
  { re: /(keto|diet|nutrition|doctor|clinic|health|md\b)/i, label: "Health" },
  { re: /(make\s*money|side\s*hustle|monetiz|creator\s*economy|thumbnail|hook|marketing|business)/i, label: "Business" },
  { re: /(aviation|ifr|vfr|aircraft|airplane|pilot|atc|airshow|raptor)/i, label: "Aviation" },
  { re: /(gardening|garden|soil|compost|mulch|prune|seedling|vegetable)/i, label: "Gardening" },
  { re: /(coding|programming|javascript|python|react|node|typescript|api|sdk)/i, label: "Coding" },
  { re: /(microsoft|apple|google|android|windows|mac|iphone|review|unboxing)/i, label: "Tech" },
];
function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s\-&]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokenize(text) {
  const norm = normalize(text);
  const toks = norm.split(/\s+/).filter(Boolean);
  const out = [];
  for (const t of toks) {
    const tt = t.replace(/^[\-_]+|[\-_]+$/g, "");
    if (!tt) continue;
    if (STOPWORDS.has(tt)) continue;
    if (GENERICS.has(tt)) continue;
    if (tt.length < 3) continue;
    out.push(tt);
  }
  return out;
}
function suggestLabelFromText(text) {
  for (const {re, label} of ALIAS_LABELS) {
    if (re.test(text)) return label;
  }
  return null;
}
function suggestLabelFromTopTerms(terms) {
  const joined = " " + terms.join(" ") + " ";
  for (const {re, label} of ALIAS_LABELS) {
    if (re.test(joined)) return label;
  }
  if (terms.length === 0) return "Misc";
  return terms[0].replace(/\b\w{1,2}\b/g, "").trim() || "Misc";
}
module.exports = { STOPWORDS, GENERICS, ALIAS_LABELS, normalize, tokenize, suggestLabelFromText, suggestLabelFromTopTerms };
