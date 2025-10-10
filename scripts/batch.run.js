// CommonJS
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { validateLabelBook } = require('./labelbook.schema.js');
const { triageSparse } = require('./triage.sparse.js');
const { shortlist } = require('./shortlist.keywords.js');
const { buildPrompt } = require('./prompt.singlechoice.js');
const { normalizeDashes } = require('../lib/labelSanitizer.js');
const { loadChoices, createIdToLabelMap } = require('../lib/choices.js');
const { validateChoice } = require('../lib/validateChoice.js');

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

// OpenAI model pricing (per 1M tokens) - current as of October 2025
const OPENAI_PRICING = {
  'gpt-5': { input: 0.125, output: 10.00 },
  'gpt-5-mini': { input: 0.250, output: 2.00 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-4-0125-preview': { input: 10.00, output: 30.00 },
  'gpt-4-1106-preview': { input: 10.00, output: 30.00 },
  'gpt-4-0613': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 1.50, output: 2.00 },
  'gpt-3.5-turbo-0125': { input: 0.50, output: 1.50 },
  'gpt-3.5-turbo-1106': { input: 1.00, output: 2.00 },
  'gpt-3.5-turbo-0613': { input: 1.50, output: 2.00 }
};

function getModelPricing(modelName) {
  const normalizedModel = modelName.toLowerCase().replace(/[^a-z0-9-]/g, '');
  for (const [model, pricing] of Object.entries(OPENAI_PRICING)) {
    if (normalizedModel.includes(model.replace(/[^a-z0-9]/g, ''))) {
      return pricing;
    }
  }
  // Fallback to gpt-4o-mini pricing if model not found
  console.warn(`Warning: Unknown model '${modelName}', using gpt-4o-mini pricing as fallback`);
  return OPENAI_PRICING['gpt-4o-mini'];
}

async function callOpenAI({ system, user, model }) {
  await ensureFetch();
  const key = process.env.OPENAI_API_KEY || "";
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  const body = { model: model||'gpt-4o-mini', temperature:0, top_p:1, response_format:{type:"json_object"}, messages:[{role:"system",content:system},{role:"user",content:user}] };
  const res = await fetchFn((process.env.OPENAI_BASE_URL||'https://api.openai.com/v1')+'/chat/completions', {method:'POST', headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'}, body:JSON.stringify(body)});
  if (!res.ok){ const txt=await res.text(); throw new Error(`OpenAI error ${res.status}: ${txt.slice(0,200)}`); }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || "{}";
  const usage = json.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  return {
    jsonResponse: content, // Raw JSON string for ID contract validation
    usage
  };
}

async function main(){
  const args = parseArgs();
  const verbose = (args.verbose === '1' || args.verbose === 'true');
  const fresh = (args.fresh === '1' || args.fresh === 'true');
  const resume = (args.resume === '1' || args.resume === 'true');

  // Dynamic shortlist configuration
  const shortlistSize = Number(args.shortlist || 12);
  const showPrompt = args.showPrompt === "1" || args.showPrompt === "true";

  // Define a generic backfill (tweak to your taxonomy as needed)
  const BACKFILL = [
    { label: "News", def: "journalism, reporting, and current events" },
    { label: "Technology", def: "software, hardware, AI, computing, devices" },
    { label: "Education", def: "instructional and learning content" },
    { label: "Lifestyle", def: "daily life, self-improvement, vlogs" },
    { label: "Music", def: "music performance, lessons, production" },
    { label: "Film & TV", def: "movies, shows, trailers, cinema" },
    { label: "Gaming", def: "video games, reviews, playthroughs" },
    { label: "Sports", def: "athletics, teams, competitions" },
    { label: "Home & Garden", def: "DIY, renovation, gardening" },
    { label: "Cooking", def: "food, recipes, culinary" },
    { label: "Health & Fitness", def: "wellness, exercise, nutrition" },
    { label: "Travel", def: "trips, destinations, exploration" }
  ];

  // Enhanced logging setup
  const logFile = 'data/run.log';
  const logFilePrev = 'data/run.log.prev';

  // Rotate log files
  if (fs.existsSync(logFile)) {
    if (fs.existsSync(logFilePrev)) {
      fs.unlinkSync(logFilePrev);
    }
    fs.renameSync(logFile, logFilePrev);
  }

  // Custom console methods with colors and file logging
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  };

  function logToFile(message) {
    fs.appendFileSync(logFile, message + '\n');
  }

  function logWithColor(color, message, fileOnly = false) {
    const coloredMessage = `${colors[color]}${message}${colors.reset}`;
    logToFile(message);
    if (!fileOnly) console.log(coloredMessage);
  }

  function logSeparator(char = '═', length = 60, color = 'cyan') {
    const separator = char.repeat(length);
    logWithColor(color, separator, false);
  }

  function logHeader(title) {
    logSeparator('═', 60, 'cyan');
    logWithColor('bright', `🚀 ${title}`, false);
    logSeparator('═', 60, 'cyan');
  }

  function logChannelProgress(current, total, channelId, title) {
    const progress = `[${current}/${total}]`;
    const channelInfo = `${colors.bright}${channelId}${colors.reset} — ${title.slice(0, 60)}`;
    const message = `${colors.blue}${progress}${colors.reset} ${channelInfo}`;
    logToFile(`${progress} ${channelId} — ${title}`);
    if (!showPrompt) console.log(message);
  }

  function logShortlist(count, labels) {
    const shortlistInfo = `shortlist(${count}): ${labels.slice(0, 5).join(' | ')}${labels.length > 5 ? ' | ...' : ''}`;
    logToFile(`  ${shortlistInfo}`);
    if (verbose && !showPrompt) console.log(`  ${colors.yellow}${shortlistInfo}${colors.reset}`);
  }

  function logClassification(label, confidence, source, evidence) {
    const confidenceColor = confidence >= 0.8 ? 'green' : confidence >= 0.6 ? 'yellow' : 'red';
    const classification = `→ label: ${colors[confidenceColor]}${label}${colors.reset}  conf: ${confidence.toFixed(2)}  src: ${source}`;
    const evidenceMsg = `    evidence: ${evidence}`;
    logToFile(`  ${classification}`);
    logToFile(`    ${evidenceMsg}`);
    if (verbose && !showPrompt) {
      console.log(`  ${classification}`);
      console.log(`    ${colors.cyan}${evidenceMsg}${colors.reset}`);
    }
  }

  function logTokens(input, output, cost) {
    const tokenInfo = `tokens: in=${input} out=${output}  est=$${cost.toFixed(6)}`;
    logToFile(`  ${tokenInfo}`);
    if (verbose && !showPrompt) console.log(`  ${colors.magenta}${tokenInfo}${colors.reset}`);
  }

  function logWarning(message) {
    const warningMsg = `⚠️  ${message}`;
    logToFile(`  ${warningMsg}`);
    if (verbose && !showPrompt) console.log(`  ${colors.yellow}${warningMsg}${colors.reset}`);
  }

  function logTriage(reason) {
    const triageMsg = `→ TRIAGE: ${colors.red}Unclassified (sparse)${colors.reset} — ${reason}`;
    logToFile(`  ${triageMsg}`);
    if (verbose && !showPrompt) console.log(`  ${triageMsg}`);
  }

  function logSummary(title, value, color = 'green') {
    logWithColor(color, `${title}: ${value}`, false);
  }

  // Parse model first for dynamic pricing
  const model = args.model || 'gpt-4o-mini';

  // Dynamic cost estimation setup based on model
  const modelPricing = getModelPricing(model);
  const priceIn  = Number(process.env.OPENAI_PRICE_INPUT_PER_MTOK || modelPricing.input);
  const priceOut = Number(process.env.OPENAI_PRICE_OUTPUT_PER_MTOK || modelPricing.output);
  let totalInTok = 0, totalOutTok = 0;
  let totalCost = 0;

  const channelsPath = args.channels || 'data/channels.json';
  const labelBookPath= args.labels   || 'data/labelbook.json';
  const outCsv        = args.out     || 'data/fitting_results.csv';
  const outJsonl      = args.jsonl   || 'data/assignments.jsonl';
  const prevJsonl     = args.prev    || 'data/assignments.prev.jsonl';
  const anchorsPath   = args.anchors || '';
  const confidenceFloor = args.confFloor ? Number(args.confFloor) : 0.40;

  const channelsRaw = loadJSON(channelsPath);
  const labelBook   = loadJSON(labelBookPath);
  const { ok, errors } = validateLabelBook(labelBook);
  if (!ok){ console.error("LabelBook validation failed:\n"+errors.join("\n")); process.exit(2); }

  // Load choices for ID-based contract
  const choices = loadChoices(labelBookPath);
  const idToLabelMap = createIdToLabelMap(labelBookPath);
  const allowedIds = choices.map(c => c.id);

  // Log labelbook summary with enhanced formatting
  logHeader("YT-DIGEST FITTING RUN");
  logWithColor('green', `📚 Loaded labelbook: ${(labelBook.umbrellas || []).length} umbrellas`, false);
  let aliasTotal = 0;
  for (const u of (labelBook.umbrellas || [])) aliasTotal += (u.aliases || []).length;
  logWithColor('green', `🔗 Indexed aliases: ${aliasTotal}`, false);

  const anchors = anchorsPath && fs.existsSync(anchorsPath) ? loadJSON(anchorsPath) : [];
  const prev = new Map(readJSONL(prevJsonl).map(r=>[r.channelId,r]));

  // Rotate previous assignments if --fresh
  if (fresh) {
    if (fs.existsSync(outJsonl)) {
      fs.copyFileSync(outJsonl, prevJsonl);
      fs.writeFileSync(outJsonl, ""); // truncate
      logWithColor('yellow', `🔄 [fresh] Rotated ${outJsonl} -> ${prevJsonl} and cleared current.`, false);
    }
    if (fs.existsSync(outCsv)) {
      const backupCsv = outCsv.replace(/\.csv$/, `.prev.csv`);
      fs.copyFileSync(outCsv, backupCsv);
      logWithColor('yellow', `💾 [fresh] Backed up ${outCsv} -> ${backupCsv}`, false);
    }
  }

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

    // Log per-channel progress with enhanced formatting
    logChannelProgress(i + 1, channels.length, channelId, title);

    // Resume short-circuit
    if (resume) {
      const prevRec = prev.get(channelId);
      if (prevRec && prevRec.label && !String(prevRec.label).startsWith("Unclassified")) {
        // Keep previous unless we expect a better one (handled by sticky logic anyway)
        // Simply write the previous record forward to current outputs.
        appendJSONL(outJsonl, prevRec);
        rows.push({
          channelId,
          channelTitle: title,
          shortDesc: (description||"").replace(/\s+/g," ").slice(0,240),
          label: prevRec.label,
          confidence: prevRec.confidence,
          knowledge_source: prevRec.knowledge_source || "text_clues",
          evidence: prevRec.evidence || "",
          shortlist_count: prevRec.shortlist_count || ""
        });
        continue;
      }
    }

    // Triage with enhanced logging
    const { isSparse, reason } = triageSparse({ title, description });
    if (isSparse) {
      logTriage(reason);
      nSparse++;
      nProcessed++;
      const record = { channelId, title, label:"Unclassified (sparse)", confidence:0, knowledge_source:"text_clues", evidence:reason, shortlist_count:0, timestamp:new Date().toISOString() };
      rows.push({ channelId, channelTitle:title, label:record.label, shortDesc: (description||"").replace(/\s+/g," ").slice(0,240), confidence:record.confidence, knowledge_source:record.knowledge_source, evidence:record.evidence, shortlist_count:0 });
      appendJSONL(outJsonl, record); continue;
    }

    // Shortlist → Prompt → LLM
    const list = shortlist({ title, description, labelBook, k: shortlistSize, backfill: BACKFILL });

    // Log shortlist with enhanced formatting
    if (list.length < 8) {
      logWarning(`shortlist underfilled (${list.length}/${shortlistSize}) for "${title.slice(0,60)}..."`);
    }
    logShortlist(list.length, list.map(x => x.name));

    const prompt = buildPrompt({ channel: { title, description }, shortlist: list, anchors, showPrompt });
    let result;
    let rawResponse = { usage: { prompt_tokens: 0, completion_tokens: 0 } }; // Initialize with defaults

    try {
      // Call OpenAI with ID-based contract
      rawResponse = await callOpenAI({ system: prompt.system, user: prompt.user, model });

      // Parse the JSON response
      let parsedResponse = {};
      try {
        parsedResponse = JSON.parse(rawResponse.jsonResponse);
      } catch (e) {
        logWarning(`Failed to parse model JSON: ${e.message}. Using unclassified.`);
        result = {
          choice_id: "unclassified",
          label: "Unclassified (invalid response)",
          confidence: 0.51,
          knowledge_source: "text_clues",
          evidence: `JSON parse error: ${e.message}`
        };
      }

      if (!result) {
        // Validate the JSON response with strict ID contract
        const validation = validateChoice(rawResponse.jsonResponse, allowedIds);

        if (!validation.ok) {
          // Debug: log the actual response and allowed IDs for troubleshooting
          if (verbose) {
            console.log(`DEBUG: Model response: ${rawResponse.jsonResponse}`);
            console.log(`DEBUG: Allowed IDs: ${JSON.stringify(allowedIds.slice(0, 5))}...`);
            if (validation.choice_id) {
              console.log(`DEBUG: Rejected choice_id: ${validation.choice_id}`);
            }
          }

          // Invalid response - use unclassified with floor confidence
          logWarning(`Invalid model response: ${validation.reason}. Using unclassified.`);
          result = {
            choice_id: "unclassified",
            label: "Unclassified (invalid response)",
            confidence: 0.51,
            knowledge_source: "text_clues",
            evidence: `Invalid response: ${validation.reason}`
          };
        } else {
          // Valid response - map ID to canonical label
          const canonicalLabel = idToLabelMap[validation.choice_id] || "Unclassified";
          result = {
            choice_id: validation.choice_id,
            label: canonicalLabel,
            confidence: validation.confidence || 0.5,
            knowledge_source: parsedResponse.knowledge_source || "text_clues",
            evidence: parsedResponse.evidence || ""
          };
        }
      }
    }
    catch(e) {
      result = {
        choice_id: "unclassified",
        label: "Unclassified (error)",
        confidence: 0,
        knowledge_source: "text_clues",
        evidence: String(e.message).slice(0,100)
      };
    }

    // Apply confidence floor
    if ((result.confidence || 0) < confidenceFloor) {
      result.label = "Unclassified (low confidence)";
      result.choice_id = "unclassified";
    }

    // Update counters and log model result with enhanced formatting
    if (result.label === "Unclassified (error)") nError++;
    if (result.label === "Unclassified (low confidence)") nLowConf++;
    if (!String(result.label).startsWith("Unclassified")) nAssigned++;
    nProcessed++;

    // Cost estimation per row
    const inTok = rawResponse.usage?.prompt_tokens || 0;
    const outTok = rawResponse.usage?.completion_tokens || 0;
    const rowCost = (inTok/1_000_000)*priceIn + (outTok/1_000_000)*priceOut;
    totalInTok += inTok; totalOutTok += outTok; totalCost += rowCost;

    // Log classification and token info with enhanced formatting
    logClassification(result.label, result.confidence, result.knowledge_source, result.evidence);
    logTokens(inTok, outTok, rowCost);

    // Sticky labels
    const previous = prev.get(channelId);
    const chosen = stickyChoice(previous && previous.label && previous.label.startsWith("Unclassified") ? null : previous, {
      channelId, title, label: result.label, choice_id: result.choice_id, confidence: result.confidence,
      knowledge_source: result.knowledge_source, evidence: result.evidence,
      shortlist_count: list.length, timestamp: new Date().toISOString()
    });
    appendJSONL(outJsonl, chosen);

    rows.push({
      channelId, channelTitle:title, label: chosen.label, label_id: chosen.choice_id || "unclassified",
      shortDesc:(description||"").replace(/\s+/g," ").slice(0,240),
      confidence: chosen.confidence, knowledge_source: chosen.knowledge_source,
      evidence: chosen.evidence, shortlist_count: list.length
    });
  }

  const secs = ((Date.now() - startedAt)/1000).toFixed(1);

  // Enhanced run summary with colors and formatting
  logSeparator('═', 60, 'cyan');
  logWithColor('bright', '📊 RUN SUMMARY', false);
  logSeparator('═', 60, 'cyan');

  logSummary('🤖 Model', model, 'blue');
  logSummary('📺 Channels', channels.length.toString(), 'blue');
  logSummary('✅ Processed', nProcessed.toString(), 'green');
  logSummary('⚠️  Sparse', nSparse.toString(), 'yellow');
  logSummary('❌ Low Conf', nLowConf.toString(), 'red');
  logSummary('💥 Errors', nError.toString(), 'red');
  logSummary('🎯 Assigned', nAssigned.toString(), 'green');
  logSummary('⏱️  Elapsed', `${secs}s`, 'cyan');
  logSummary('🔢 Tokens', `in=${totalInTok} out=${totalOutTok}`, 'magenta');
  logSummary('💰 Est Cost', `$${totalCost.toFixed(4)} (in @$${priceIn}/MTok, out @$${priceOut}/MTok)`, 'yellow');

  const headers = ["channelId","channelTitle","label","label_id","shortDesc","confidence","knowledge_source","evidence","shortlist_count"];
  fs.mkdirSync(path.dirname(outCsv), { recursive:true });
  fs.writeFileSync(outCsv, writeCSV(rows, headers), 'utf8');

  logSeparator('═', 60, 'green');
  logWithColor('green', `✅ Wrote ${rows.length} rows to ${outCsv}`, false);
  logWithColor('green', `📋 Full log saved to data/run.log`, false);
  logWithColor('green', `💾 Previous log backed up to data/run.log.prev`, false);
  logSeparator('═', 60, 'green');
}

if (require.main === module) { main().catch(err=>{ console.error(err); process.exit(1); }); }
module.exports = {};
