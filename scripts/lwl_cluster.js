// scripts/lwl_cluster.js (CommonJS)
const fs = require("fs");
const path = require("path");
const { tokenize, normalize, suggestLabelFromText, suggestLabelFromTopTerms } = require("./label_terms");

const CHANNELS_PATH = path.resolve(process.cwd(), "data", "channels.json");
const OUT_DIR = path.resolve(process.cwd(), "data");
const MIN_DESC_LEN = 40;
const MIN_TITLE_TOKENS = 3;
const SIM_THRESHOLD = 0.27;
const MAX_CANDIDATES_PER_TOKEN = 250;
const HASH_DIM = 2048;

function readJson(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function ensureDir(p){ if (!fs.existsSync(p)) fs.mkdirSync(p, {recursive:true}); }

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
  let norm = 0;
  for (let i=0;i<HASH_DIM;i++) norm += vec[i]*vec[i];
  norm = Math.sqrt(norm) || 1;
  for (let i=0;i<HASH_DIM;i++) vec[i] /= norm;
  return vec;
}
function cosine(a,b){ let s=0; for(let i=0;i<a.length;i++) s+=a[i]*b[i]; return s; }

function connectedComponents(n, edges){
  const parent = Array.from({length:n}, (_,i)=>i);
  const rank = new Array(n).fill(0);
  const find = x => parent[x]===x ? x : (parent[x]=find(parent[x]));
  const unite = (a,b)=>{ a=find(a); b=find(b); if (a===b) return; if(rank[a]<rank[b]) [a,b]=[b,a]; parent[b]=a; if(rank[a]===rank[b]) rank[a]++; };
  for (const [u,v] of edges) unite(u,v);
  const groups = new Map();
  for (let i=0;i<n;i++){ const r=find(i); if(!groups.has(r)) groups.set(r, []); groups.get(r).push(i); }
  return Array.from(groups.values());
}

function tfidfTopTerms(indices, docsTokens, df, N, k=8){
  const tf = new Map();
  for (const idx of indices){ for (const t of docsTokens[idx]) tf.set(t, (tf.get(t)||0)+1); }
  const scored = [];
  for (const [t,c] of tf){
    const dfi = df.get(t)||1;
    const idf = Math.log((N+1)/(dfi+0.5));
    scored.push([t, c*idf]);
  }
  scored.sort((a,b)=>b[1]-a[1]);
  return scored.slice(0,k).map(x=>x[0]);
}

function main(){
  ensureDir(OUT_DIR);
  const raw = readJson(CHANNELS_PATH);
  const channels = Array.isArray(raw) ? raw : Array.isArray(raw.channels) ? raw.channels : [];
  if (!channels.length){ console.error("No channels in data/channels.json"); process.exit(1); }

  const docsTokens=[], vectors=[], sparse=[], names=[], ids=[], rawTexts=[];
  for (const ch of channels){
    const id = ch.channelId || ch.id || ch._id || ch.cid || "";
    const title = ch.channelName || ch.name || ch.title || "";
    const desc = ch.description || ch.channelDescription || "";
    const textRaw = (desc && desc.trim().length>=MIN_DESC_LEN) ? desc : "";
    const text = textRaw || title;
    const tok = tokenize(text);
    const isSparse = (!textRaw && (tokenize(title).length < MIN_TITLE_TOKENS));
    sparse.push(isSparse);
    names.push(title || id || "Unknown");
    ids.push(id || title || "unknown");
    rawTexts.push(text);
    docsTokens.push(tok);
    vectors.push(featureHashVector(tok));
  }

  const df = new Map();
  for (const toks of docsTokens){
    const u = new Set(toks);
    for (const t of u) df.set(t, (df.get(t)||0)+1);
  }

  const inv = new Map();
  docsTokens.forEach((toks,i)=>{
    const u = new Set(toks);
    for (const t of u){
      if(!inv.has(t)) inv.set(t, new Set());
      const s = inv.get(t);
      if (s.size < MAX_CANDIDATES_PER_TOKEN) s.add(i);
    }
  });

  const edges=[], seen=new Set();
  docsTokens.forEach((toks,i)=>{
    const cand = new Set();
    for (const t of new Set(toks)){
      const s = inv.get(t);
      if(!s) continue;
      for (const j of s) if (j!==i) cand.add(j);
    }
    for (const j of cand){
      const a=i, b=j;
      const key = a<b ? `${a}-${b}` : `${b}-${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const sim = cosine(vectors[a], vectors[b]);
      if (sim >= SIM_THRESHOLD) edges.push([a,b]);
    }
  });

  const comps = connectedComponents(channels.length, edges);
  const clusters = [];
  const channelToCluster = new Array(channels.length).fill(-1);
  let cid=0;
  for (const comp of comps){
    if (comp.length===1 && sparse[comp[0]]) continue;
    const texts = comp.map(i=>rawTexts[i]).join(" ");
    const alias = suggestLabelFromText(texts);
    const topTerms = tfidfTopTerms(comp, docsTokens, df, channels.length, 8);
    const label = alias || suggestLabelFromTopTerms(topTerms);

    let sum=0, cnt=0;
    for (let ii=0; ii<comp.length; ii++){
      for (let jj=ii+1; jj<comp.length; jj++){
        sum += cosine(vectors[comp[ii]], vectors[comp[jj]]);
        cnt++;
      }
    }
    const cohesion = cnt? (sum/cnt) : 0;

    const members = comp.map(i=>({id:ids[i], name:names[i]}));
    clusters.push({ label, size: comp.length, cohesion: Number(cohesion.toFixed(3)), topTerms, members });
    for (const i of comp) channelToCluster[i]=cid;
    cid++;
  }

  const jpath = path.join(OUT_DIR, "lwl_clusters.json");
  const chanCsv = path.join(OUT_DIR, "lwl_channels.csv");
  const sumCsv = path.join(OUT_DIR, "lwl_summary.csv");

  fs.writeFileSync(jpath, JSON.stringify(clusters, null, 2));

  {
    const header = "channelId,channelName,lwlLabel,topTerms\n";
    const lines = [header];
    channels.forEach((ch, i)=>{
      const idx = channelToCluster[i];
      const label = (idx>=0)? clusters[idx].label : (sparse[i] ? "Unclassified (sparse)" : "Unclassified");
      const top = (idx>=0)? clusters[idx].topTerms.slice(0,5).join("|") : "";
      const id = ch.channelId || ch.id || ch._id || ch.cid || "";
      const name = (ch.channelName || ch.name || ch.title || "").replace(/"/g,'""');
      lines.push(`${id},"${name}",${label?`"${label.replace(/"/g,'""')}"`:""},${top?`"${top.replace(/"/g,'""')}"`:""}\n`);
    });
    fs.writeFileSync(chanCsv, lines.join(""));
  }
  {
    const total = channels.length;
    const header = "label,count,percent,cohesion\n";
    const lines = [header];
    for (const c of clusters){
      const pct = ((c.size/total)*100).toFixed(2);
      lines.push(`"${c.label}",${c.size},${pct},${c.cohesion}\n`);
    }
    fs.writeFileSync(sumCsv, lines.join(""));
  }

  console.log("Wrote:\n -", jpath, "\n -", chanCsv, "\n -", sumCsv);
}

if (require.main === module){ main(); }
