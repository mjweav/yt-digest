
// scripts/fitting_harness.js
// Usage:
// node scripts/fitting_harness.js --channels data/channels.json --labels data/master_labels.sample.json --out data/fitting_results.csv --use-ai=1 --topk=3 --rows=10

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { aiDisambiguate } = require('./ai_helper.js');

function arg(name, def = undefined) {
  const v = process.argv.find(a => a.startsWith(`--${name}=`));
  if (!v) return def;
  return v.split('=').slice(1).join('=');
}

const channelsPath = arg('channels', 'data/channels.json');
const labelsPath   = arg('labels',   'data/master_labels.sample.json');
const outPath      = arg('out',      'data/fitting_results.csv');
const useAI        = arg('use-ai',   '0') === '1';
const topk         = parseInt(arg('topk', '3'), 10);
const maxRows      = parseInt(arg('rows', '0'), 10); // 0 means no limit

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function normalizeChannel(c) {
  const title = c.title || c.snippet?.title || c.channelTitle || '';
  const desc  = c.desc || c.description || c.snippet?.description || '';
  const id    = c.id || c.channelId || c.snippet?.channelId || '';
  return { id, title, desc };
}

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}]/gu,' ') // remove emojis
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function windowTokens(tokens, n) {
  const out = new Set();
  for (let i = 0; i < tokens.length; i++) {
    for (let k = 1; k <= n; k++) {
      if (i + k <= tokens.length) {
        out.add(tokens.slice(i, i + k).join(' '));
      }
    }
  }
  return out;
}

function scoreChannel({ title, desc }, labels) {
  const toks = tokenize(`${title} ${desc}`);
  const grams = windowTokens(toks, 3);
  const scores = [];

  for (const lab of labels) {
    const names = new Set([lab.name, ...(lab.aliases || [])].map(s => s.toLowerCase()));
    let s = 0;

    for (const n of names) {
      if (grams.has(n)) {
        const len = Math.max(1, n.split(' ').length);
        s += len >= 3 ? 2.0 : (len === 2 ? 1.2 : 0.7);
      } else {
        const re = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i');
        if (re.test(title) || re.test(desc)) s += 0.5;
      }
    }

    if (s > 0) scores.push({ label: lab.name, score: Number(s.toFixed(3)) });
  }

  scores.sort((a,b) => b.score - a.score);
  const top = scores.slice(0, topk);
  const topScore = top[0]?.score || 0;
  const secondScore = top[1]?.score || 0;
  const margin = Number((topScore - secondScore).toFixed(3));

  return { top, margin, topScore, secondScore, all: scores };
}

async function main() {
  const channelsRaw = loadJSON(channelsPath);
  const labelsRaw   = loadJSON(labelsPath);
  const channels = Array.isArray(channelsRaw) ? channelsRaw : (channelsRaw.channels || channelsRaw.items || []);
  const labels = labelsRaw.labels || [];

  const rows = [];
  const channelsToProcess = maxRows > 0 ? channels.slice(0, maxRows) : channels;

  for (const c of channelsToProcess) {
    const ch = normalizeChannel(c);
    if (!ch.id) continue;

    const scored = scoreChannel(ch, labels);
    let assigned = scored.top.map(x => x.label);
    let method = 'lexical';

    if (useAI && (scored.margin < 0.6 || assigned.length === 0 || scored.top.length === 0) && (ch.title || ch.desc)) {
      console.log(`AI triggered for ${ch.title}: margin=${scored.margin}, assigned=${assigned.length}, top=${scored.top.length}`);
      const cands = scored.top.length > 0 ? scored.top.map(x => x.label) : [];
      const ai = await aiDisambiguate({ title: ch.title, description: ch.desc, candidates: cands, maxLabels: topk });
      if (Array.isArray(ai.labels) && ai.labels.length) {
        assigned = ai.labels;
        method = 'ai_tiebreak';
        console.log(`AI assigned: ${assigned.join(', ')} for ${ch.title}`);
      } else {
        console.log(`AI returned empty labels: ${JSON.stringify(ai)} for ${ch.title}`);
      }
    }

    rows.push({
      channelId: ch.id,
      channelTitle: ch.title,
      shortDesc: (ch.desc || '').replace(/\s+/g,' ').slice(0, 240),
      labels: assigned.join(' | '),
      method,
      topScore: scored.topScore,
      margin: scored.margin,
      candidates: JSON.stringify(scored.top)
    });
  }

  const headers = ["channelId","channelTitle","shortDesc","labels","method","topScore","margin","candidates"];
  const csv = [headers.join(",")].concat(
    rows.map(r => headers.map(h => JSON.stringify(r[h])).join(","))
  ).join("\n");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, csv, 'utf8');

  const limitInfo = maxRows > 0 ? ` (limited to ${maxRows} rows for testing)` : '';
  console.log(`Wrote ${rows.length} rows to ${outPath}${limitInfo}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
