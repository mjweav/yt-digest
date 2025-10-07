// scripts/export_lowmargin.js
// Usage: node scripts/export_lowmargin.js [--perCluster=15] [--overall=50]
// Output: data/ao_channels_lowmargin.csv

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const DBG = path.join(ROOT, "data/autoOrganize.debug.json");
const MET = path.join(ROOT, "data/autoOrganize.metrics.json");
const OUT = path.join(ROOT, "data/ao_channels_lowmargin.csv");

function J(p, d={}) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return d; } }
function esc(v){ if(v==null) return ""; v=String(v); return /[",\n\r]/.test(v)?`"${v.replace(/"/g,'""')}"`:v; }
function writeCSV(p, rows){ fs.writeFileSync(p, rows.map(r=>r.map(esc).join(",")).join("\n")+"\n","utf8"); }

const args = Object.fromEntries(process.argv.slice(2).map(a=>a.split("=").map(s=>s.replace(/^--/,""))));
const PER = Number(args.perCluster||15), OVER=Number(args.overall||50);

const dbg = J(DBG, {}), met = J(MET, {});
const rows = (dbg.debugRows||dbg.rows||[]).map(r=>({
  id: r.id||r.channelId||"",
  name: r.name||r.channelName||"",
  label: r.assignedLabel||r.label||"",
  margin: Number(r.margin ?? 0),
  top: Number(r.topScore ?? r.score ?? 0),
  second: Number(r.secondScore ?? 0),
  desc: r.description || ""
}));

function low(xs,n){ return xs.filter(r=>Number.isFinite(r.margin)).sort((a,b)=>a.margin-b.margin).slice(0,n); }

const out=[["channelId","channelName","assignedLabel","margin","topScore","secondScore","description"]];

out.push(["","----- LOWEST MARGINS OVERALL -----","","","","",""]);
for(const r of low(rows, OVER)) out.push([r.id,r.name,r.label,r.margin,r.top,r.second,r.desc]);

for(const c of (met.perCluster||[]).map(x=>x.label)){
  const inC = rows.filter(r=>r.label===c);
  if(!inC.length) continue;
  out.push(["",`----- LOWEST MARGINS: ${c} -----`,"","","",""]);
  for(const r of low(inC, PER)) out.push([r.id,r.name,r.label,r.margin,r.top,r.second,r.desc]);
}

writeCSV(OUT, out);
console.log("WROTE:", OUT);
