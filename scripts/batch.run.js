// CommonJS
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { validateLabelBook } = require('./labelbook.schema.js');
const { triageSparse } = require('./triage.sparse.js');
const { shortlist } = require('./shortlist.keywords.js');
const { buildPrompt } = require('./prompt.singlechoice.js');

// Prefer global fetch (Node 18+); lazy-load node-fetch if missing
let fetchFn = global.fetch;
async function ensureFetch() {
  if (!fetchFn) {
    try { fetchFn = (await import('node-fetch')).default; }
    catch { throw new Error("Fetch not available. Install node-fetch or run on Node 18+: npm i node-fetch"); }
  }
}
function parseArgs(){const o={};process.argv.slice(2).forEach(a=>{const m=a.match(/^--([^=]+)=(.*)$/);if(m)o[m[1]]=m[2];});return o;}
function loadJSON(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
function writeCSV(rows, headers){const esc=v=>`"${String(v??"").replace(/"/g,'""')}"`;return[headers.join(",")].concat(rows.map(r=>headers.map(h=>esc(r[h])).join(","))).join("\n");}
function readJSONL(p){if(!fs.existsSync(p))return[];return fs.readFileSync(p,'utf8').trim().split(/\r?\n/).filter(Boolean).map(l=>{try{return JSON.parse(l);}catch{return null;}}).filter(Boolean);}
function appendJSONL(p,obj){fs.mkdirSync(path.dirname(p),{recursive:true});fs.appendFileSync(p,JSON.stringify(obj)+"\n");}
function stickyChoice(prev,next){if(!prev)return next;return (next.confidence??0)>=(prev.confidence??0)+0.15?next:prev;}

async function callOpenAI({ system, user, model }) {
  await ensureFetch();
  const key = process.env.OPENAI_API_KEY || "";
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  const body = { model: model||'gpt-4o-mini', temperature:0, top_p:1, response_format:{type:"json_object"}, messages:[{role:"system",content:system},{role:"user",content:user}] };
  const res = await fetchFn((process.env.OPENAI_BASE_URL||'https://api.openai.com/v1')+'/chat/completions', {method:'POST', headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'}, body:JSON.stringify(body)});
  if (!res.ok){ const txt=await res.text(); throw new Error(`OpenAI error ${res.status}: ${txt.slice(0,200)}`); }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || "{}";
  let parsed={}; try{parsed=JSON.parse(content);}catch{throw new Error("Failed to parse JSON from model");}
  return {
    label: String(parsed.label||""),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence||0))),
    knowledge_source: parsed.knowledge_source==="world_knowledge"?"world_knowledge":"text_clues",
    evidence: String(parsed.evidence||"").slice(0,100)
  };
}

async function main(){
  const args = parseArgs();
  const verbose = (args.verbose === '1' || args.verbose === 'true');
  const channelsPath = args.channels || 'data/channels.json';
  const labelBookPath= args.labels   || 'data/labelbook.json';
  const outCsv        = args.out     || 'data/fitting_results.csv';
  const outJsonl      = args.jsonl   || 'data/assignments.jsonl';
  const prevJsonl     = args.prev    || 'data/assignments.prev.jsonl';
  const anchorsPath   = args.anchors || '';
  const model         = args.model   || 'gpt-4o-mini';
  const confidenceFloor = args.confFloor ? Number(args.confFloor) : 0.40;

  const channelsRaw = loadJSON(channelsPath);
  const labelBook   = loadJSON(labelBookPath);
  const { ok, errors } = validateLabelBook(labelBook);
  if (!ok){ console.error("LabelBook validation failed:\n"+errors.join("\n")); process.exit(2); }
  const anchors = anchorsPath && fs.existsSync(anchorsPath) ? loadJSON(anchorsPath) : [];
  const prev = new Map(readJSONL(prevJsonl).map(r=>[r.channelId,r]));

  const channels = Array.isArray(channelsRaw) ? channelsRaw : (channelsRaw.channels || channelsRaw.items || []);
  const rows = [];

  // Instrumentation counters and timer
  const startedAt = Date.now();
  let nProcessed = 0, nSparse = 0, nError = 0, nLowConf = 0, nAssigned = 0;

  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    const title = ch.title || ch.snippet?.title || ch.channelTitle || "";
    const description = ch.description || ch.snippet?.description || ch.desc || "";
    const channelId = ch.id || ch.channelId || ch.snippet?.channelId || "";
    if (!channelId) continue;

    // Log per-channel progress
    if (verbose) {
      console.log(`[${i+1}/${channels.length}] ${channelId || "NO_ID"} — ${String(title).slice(0,80)}`);
    }

    // Triage
    const { isSparse, reason } = triageSparse({ title, description });
    if (isSparse) {
      if (verbose) console.log(`  → TRIAGE: Unclassified (sparse) — ${reason}`);
      nSparse++;
      nProcessed++;
      const record = { channelId, title, label:"Unclassified (sparse)", confidence:0, knowledge_source:"text_clues", evidence:reason, shortlist_count:0, timestamp:new Date().toISOString() };
      rows.push({ channelId, channelTitle:title, label:record.label, shortDesc: (description||"").replace(/\s+/g," ").slice(0,240), confidence:record.confidence, knowledge_source:record.knowledge_source, evidence:record.evidence, shortlist_count:0 });
      appendJSONL(outJsonl, record); continue;
    }

    // Shortlist → Prompt → LLM
    const list = shortlist({ title, description, labelBook, k:12 });
    if (verbose) console.log(`  shortlist(${list.length}): ${list.map(x=>x.name).join(" | ")}`);
    const prompt = buildPrompt({ channel: { title, description }, shortlist: list, anchors });
    let result;
    try { result = await callOpenAI({ system: prompt.system, user: prompt.user, model }); }
    catch(e){ result = { label:"Unclassified (error)", confidence:0, knowledge_source:"text_clues", evidence:String(e.message).slice(0,100) }; }

    // Confidence floor + shortlist guard
    if ((result.confidence||0) < confidenceFloor) {
      result.label = "Unclassified (low confidence)";
    } else {
      const names = new Set(list.map(x=>x.name));
      if (!names.has(result.label)) result.label = list[0]?.name || result.label;
    }

    // Update counters and log model result
    if (result.label === "Unclassified (error)") nError++;
    if (result.label === "Unclassified (low confidence)") nLowConf++;
    if (!String(result.label).startsWith("Unclassified")) nAssigned++;
    nProcessed++;
    if (verbose) {
      console.log(`  → label: ${result.label}  conf: ${result.confidence.toFixed(2)}  src: ${result.knowledge_source}`);
      if (result.evidence) console.log(`    evidence: ${result.evidence}`);
    }

    // Sticky labels
    const previous = prev.get(channelId);
    const chosen = stickyChoice(previous && previous.label && previous.label.startsWith("Unclassified") ? null : previous, {
      channelId, title, label: result.label, confidence: result.confidence,
      knowledge_source: result.knowledge_source, evidence: result.evidence,
      shortlist_count: list.length, timestamp: new Date().toISOString()
    });
    appendJSONL(outJsonl, chosen);

    rows.push({
      channelId, channelTitle:title, label: chosen.label, shortDesc:(description||"").replace(/\s+/g," ").slice(0,240),
      confidence: chosen.confidence, knowledge_source: chosen.knowledge_source,
      evidence: chosen.evidence, shortlist_count: list.length
    });
  }

  const secs = ((Date.now() - startedAt)/1000).toFixed(1);
  console.log(`\n== Run Summary ==`);
  console.log(`channels: ${channels.length}`);
  console.log(`processed: ${nProcessed}, sparse: ${nSparse}, low_conf: ${nLowConf}, errors: ${nError}, assigned: ${nAssigned}`);
  console.log(`elapsed: ${secs}s`);

  const headers = ["channelId","channelTitle","label","shortDesc","confidence","knowledge_source","evidence","shortlist_count"];
  fs.mkdirSync(path.dirname(outCsv), { recursive:true });
  fs.writeFileSync(outCsv, writeCSV(rows, headers), 'utf8');
  console.log(`Wrote ${rows.length} rows to ${outCsv}`);
}

if (require.main === module) { main().catch(err=>{ console.error(err); process.exit(1); }); }
module.exports = {};
