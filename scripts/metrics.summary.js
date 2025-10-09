// CommonJS
require('dotenv').config();
const fs = require('fs');
function parseArgs(){const o={};process.argv.slice(2).forEach(a=>{const m=a.match(/^--([^=]+)=(.*)$/);if(m)o[m[1]]=m[2];});return o;}
function readJSONL(p){if(!fs.existsSync(p))return[];return fs.readFileSync(p,'utf8').trim().split(/\r?\n/).filter(Boolean).map(l=>{try{return JSON.parse(l);}catch{return null;}}).filter(Boolean);}
function median(a){if(!a.length)return 0; const s=a.slice().sort((x,y)=>x-y), m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2;}
function entropy(counts){const tot=counts.reduce((a,b)=>a+b,0)||1;let e=0;for(const c of counts){if(!c)continue;const p=c/tot;e-=p*Math.log2(p);}return e;}
function summarize({ jsonl, prevJsonl }) {
  const rows = readJSONL(jsonl); const prev = new Map(readJSONL(prevJsonl).map(r=>[r.channelId,r]));
  const nonSparse = rows.filter(r => !String(r.label).startsWith("Unclassified (sparse)"));
  const coverage = nonSparse.length / (rows.length || 1);
  const confidences = rows.filter(r=>typeof r.confidence==='number').map(r=>r.confidence);
  const medConf = median(confidences);
  let flips=0, comparable=0;
  for (const r of rows){ const p=prev.get(r.channelId); if(!p) continue; if(String(p.label).startsWith("Unclassified")) continue;
    comparable++; if(p.label!==r.label && (r.confidence||0) < (p.confidence||0) + 0.15) flips++; }
  const flipRate = comparable ? flips/comparable : 0;
  const countsMap = new Map(); for (const r of rows){ const k=r.label||"Unclassified"; countsMap.set(k,(countsMap.get(k)||0)+1); }
  const counts=[...countsMap.values()]; const ent=entropy(counts);
  const top=[...countsMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
  return { total: rows.length, coverage, median_confidence: medConf, flip_rate: flipRate, entropy: ent, top_labels: top };
}
function main(){ const a=parseArgs(); const s=summarize({ jsonl:a.jsonl||'data/assignments.jsonl', prevJsonl:a.prev||'data/assignments.prev.jsonl' }); const output=a.out||a.output||'data/metrics.json'; fs.writeFileSync(output,JSON.stringify(s,null,2)); console.log(`Metrics saved to ${output}`); console.log(JSON.stringify(s,null,2)); }
if (require.main===module) main();
module.exports = { summarize };
