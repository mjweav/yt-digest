// scripts/umbrella_fit.js (CommonJS, no external deps)
// Usage: node scripts/umbrella_fit.js [--channels data/channels.json] [--topics data/umbrella_topics.json]
// Outputs: data/umbrella_channels.csv, data/umbrella_summary.csv, data/umbrella_debug.json

const fs = require("fs");
const path = require("path");

// ---------- Config knobs (tune here) ----------
const CHANNELS_PATH = getArg("--channels") || path.resolve(process.cwd(), "data", "channels.json");
const TOPICS_PATH   = getArg("--topics")   || path.resolve(process.cwd(), "data", "umbrella_topics.json");
const OUT_DIR       = path.resolve(process.cwd(), "data");

const TITLE_WEIGHT = 1.6;     // boost for title tokens vs description
const MIN_DESC_LEN = 40;      // below = "sparse" description
const MIN_TITLE_TOKENS = 3;   // title token count to consider non-sparse if desc sparse

const HASH_DIM = 2048;        // feature hashing vector size (cosine space)
const SCORE_MIN = 0.24;       // minimum cosine to accept a topic
const MARGIN_MIN = 0.10;      // top - second must be >= this
const MAX_TOP3 = 3;           // write top3 candidates per channel in debug

// Stopwords / generics
const STOPWORDS = new Set([
  "the","a","an","and","or","but","if","then","else","for","to","of","in","on","at","by","with",
  "from","as","is","are","was","were","be","been","being","it","its","this","that","those","these",
  "we","you","they","i","me","my","your","our","their","them","us",
  "new","official","channel","video","videos","subscribe","watch","welcome","about","more","info",
  "how","why","what","when","where","can","will","just","get","make","made","using","use","tips",
  "free","best","top","latest","daily","weekly","month","year","world","global","news","update","updates"
]);
const GENERICS = new Set(["video","learn","tutorial","guide","content","create","creator","official","series","episode","ep","click","link","store","merch","premium","plus","originals","free","trial","live","stream","season","premiere","now","today","tonight"]);

// ---------- Helpers ----------
function getArg(flag){
  const i = process.argv.indexOf(flag);
  if (i>=0 && i+1<process.argv.length) return process.argv[i+1];
  return null;
}
function readJson(p){
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch(e){ return null; }
}
function ensureDir(p){ if (!fs.existsSync(p)) fs.mkdirSync(p, {recursive:true}); }

function normalize(text){
  return (text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s\-&]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokenize(text){
  const norm = normalize(text);
  const toks = norm.split(/\s+/).filter(Boolean);
  const out = [];

  // Helper: is token time/date/number noise?
  const TIME_NUM_RE = /^(\d(1, 2):\d2(?:am|pm)?|\d(1, 2)(?:am|pm)|\d4|\d(1, 2)[\/\-]\d(1, 2)(?:[\/\-]\d(2, 4))?|\d+(?:k|p|fps)?)$/i;

  for (const t of toks){
    const tt = t.replace(/^[\-_]+|[\-_]+$/g, "");
    if (!tt) continue;
    if (STOPWORDS.has(tt)) continue;
    if (GENERICS.has(tt)) continue;
    if (tt.length < 3) continue;
    if (/^\d+$/.test(tt)) continue;                // pure numbers
    if (TIME_NUM_RE.test(tt)) continue;             // times, dates, 4k/1080p/etc.
    out.push(tt);
  }
  return out;
}

function featureHashVector(tokens){
  const vec = new Float32Array(HASH_DIM);
  for (const tok of tokens){
    let h = 2166136261;
    for (let i=0;i<tok.length;i++){
      h ^= tok.charCodeAt(i);
      h += (h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);
    }
    const idx = Math.abs(h) % HASH_DIM;
    const sign = ((h>>>31)&1) ? -1 : 1;
    vec[idx] += sign;
  }
  // L2 normalize
  let norm = 0;
  for (let i=0;i<HASH_DIM;i++) norm += vec[i]*vec[i];
  norm = Math.sqrt(norm) || 1;
  for (let i=0;i<HASH_DIM;i++) vec[i] /= norm;
  return vec;
}
function cosine(a,b){ let s=0; for (let i=0;i<a.length;i++) s += a[i]*b[i]; return s; }

function weightedTokens(title, desc){
  const tTok = tokenize(title);
  const dTok = tokenize(desc);
  // apply weight by duplicating (simple, fast)
  const out = [];
  for (const t of tTok) for (let k=0;k<Math.max(1, Math.round(TITLE_WEIGHT)); k++) out.push(t);
  for (const t of dTok) out.push(t);
  return out;
}

// Build topic vectors from umbrella_topics.json: tokens with optional weights.
function buildTopicVecs(topicDefs){
  const topics = [];
  for (const def of topicDefs){
    const label = def.label;
    const seeds = Array.isArray(def.seeds) ? def.seeds : [];
    const tokenWeights = new Map();
    for (const s of seeds){
      // seeds can be "token" or { token, w }
      if (typeof s === "string"){
        const toks = tokenize(s);
        for (const tk of toks) tokenWeights.set(tk, Math.max(1, (tokenWeights.get(tk)||0)+1));
      } else if (s && typeof s === "object"){
        const toks = tokenize(s.token || "");
        const w = Number(s.w || 1);
        for (const tk of toks) tokenWeights.set(tk, (tokenWeights.get(tk)||0)+w);
      }
    }
    // Expand vector
    const bag = [];
    for (const [tk,w] of tokenWeights.entries()){
      for (let k=0;k<Math.max(1, Math.round(w)); k++) bag.push(tk);
    }
    const vec = featureHashVector(bag);
    topics.push({ label, vec, rawTokens: Array.from(tokenWeights.entries()) });
  }
  return topics;
}

// ---------- Main ----------
function main(){
  ensureDir(OUT_DIR);

  const channelsRaw = readJson(CHANNELS_PATH);
  if (!channelsRaw){ console.error("Cannot read channels at", CHANNELS_PATH); process.exit(1); }
  const channels = Array.isArray(channelsRaw) ? channelsRaw : (Array.isArray(channelsRaw.channels) ? channelsRaw.channels : []);
  if (!channels.length){ console.error("No channels found in channels file."); process.exit(1); }

  const topicsRaw = readJson(TOPICS_PATH);
  if (!topicsRaw || !Array.isArray(topicsRaw.topics)){ console.error("Cannot read topics at", TOPICS_PATH); process.exit(1); }
  const topics = buildTopicVecs(topicsRaw.topics);
  if (!topics.length){ console.error("No topics defined in umbrella_topics.json"); process.exit(1); }

  const chRows = [];
  const debug = [];
  const counts = new Map();

  for (const ch of channels){
    const id = ch.channelId || ch.id || ch._id || ch.cid || "";
    const name = ch.channelName || ch.name || ch.title || "";
    const desc = ch.description || ch.channelDescription || "";
    const isSparse = !(desc && desc.trim().length >= MIN_DESC_LEN);

    const toks = isSparse
      ? (tokenize(name).length >= MIN_TITLE_TOKENS ? tokenize(name) : [])
      : weightedTokens(name, desc);

    if (toks.length === 0){
      // Immediate Unclassified
      chRows.push({ id, name, label:"Unclassified (sparse)", score:0, margin:0, top3:[] });
      counts.set("Unclassified (sparse)", (counts.get("Unclassified (sparse)")||0)+1);
      debug.push({ id, name, reason:"sparse", top:[] });
      continue;
    }

    const v = featureHashVector(toks);
    const scores = topics.map(t => ({ label: t.label, s: cosine(v, t.vec) }));
    scores.sort((a,b)=>b.s-a.s);
    const top = scores[0];
    const second = scores[1] || {s:0,label:null};
    const margin = top.s - second.s;

    const accept = (top.s >= SCORE_MIN) && (margin >= MARGIN_MIN);
    const label = accept ? top.label : "Unclassified";

    chRows.push({
      id, name, label,
      score: Number(top.s.toFixed(4)),
      margin: Number(margin.toFixed(4)),
      top3: scores.slice(0, Math.min(MAX_TOP3, scores.length))
    });
    counts.set(label, (counts.get(label)||0)+1);
    debug.push({
      id, name, sparse:isSparse, scoreTop:top.s, scoreSecond:second.s, margin,
      top5: scores.slice(0, 5)
    });
  }

  // Write CSVs + debug
  const chCsv = path.join(OUT_DIR, "umbrella_channels.csv");
  const sumCsv = path.join(OUT_DIR, "umbrella_summary.csv");
  const dbgJs = path.join(OUT_DIR, "umbrella_debug.json");

  // channels CSV
  {
    const header = "channelId,channelName,umbrellaLabel,score,margin,top3\n";
    const lines = [header];
    for (const r of chRows){
      const top3 = r.top3.map(x=>`${x.label}:${x.s.toFixed(3)}`).join("|");
      const nameQ = (r.name||"").replace(/"/g,'""');
      const labelQ = (r.label||"").replace(/"/g,'""');
      lines.push(`${r.id},"${nameQ}","${labelQ}",${r.score},${r.margin},"${top3}"\n`);
    }
    fs.writeFileSync(chCsv, lines.join(""));
  }

  // summary CSV
  {
    const total = chRows.length;
    const header = "label,count,percent\n";
    const lines = [header];
    const entries = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]);
    for (const [label, cnt] of entries){
      const pct = ((cnt/total)*100).toFixed(2);
      lines.push(`"${label}",${cnt},${pct}\n`);
    }
    fs.writeFileSync(sumCsv, lines.join(""));
  }

  fs.writeFileSync(dbgJs, JSON.stringify({ params:{TITLE_WEIGHT, SCORE_MIN, MARGIN_MIN, HASH_DIM}, topics: topicsRaw.topics, channels: debug }, null, 2));

  console.log("Wrote:",
    "\n -", chCsv,
    "\n -", sumCsv,
    "\n -", dbgJs
  );
}

if (require.main === module){ main(); }
