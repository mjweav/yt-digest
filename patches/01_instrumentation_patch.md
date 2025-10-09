
# Patch 01 — Instrumentation & Verbose Console Output (CommonJS)

**Goal:** Show progress while running (which row/channel is being processed), shortlist chosen, model result, and a summary at the end. Controlled by a `--verbose` flag.

## Files to edit
- `scripts/batch.run.js`

## Changes

### 1) Parse `--verbose`
Add after `parseArgs()` usage:
```js
// (near top of batch.run.js, after parseArgs definition and args loading)
const verbose = (args.verbose === '1' || args.verbose === 'true');
```

### 2) Add simple counters and start timer
Place just after we load channels & before the for-loop:
```js
const startedAt = Date.now();
let nProcessed = 0, nSparse = 0, nError = 0, nLowConf = 0, nAssigned = 0;
```

### 3) Log per-channel progress
Inside the for-loop, **right after** we derive `title`, `description`, `channelId`:
```js
if (verbose) {
  console.log(`[${rows.length+1}/${channels.length}] ${channelId || "NO_ID"} — ${String(title).slice(0,80)}`);
}
```

### 4) Log triage decisions
Right before `continue;` inside the triage block:
```js
if (verbose) console.log(`  → TRIAGE: Unclassified (sparse) — ${reason}`);
nSparse++;
nProcessed++;
```

### 5) Log shortlist
After computing `const list = shortlist(...)`:
```js
if (verbose) console.log(`  shortlist(${list.length}): ${list.map(x=>x.name).join(" | ")}`);
```

### 6) Log model result and classification path
After `result` is populated and **after** the confidence floor / shortlist guard & sticky logic:
```js
if (result.label === "Unclassified (error)") nError++;
if (result.label === "Unclassified (low confidence)") nLowConf++;
if (!String(result.label).startsWith("Unclassified")) nAssigned++;
nProcessed++;
if (verbose) {
  console.log(`  → label: ${chosen.label}  conf: ${chosen.confidence.toFixed(2)}  src: ${chosen.knowledge_source}`);
  if (chosen.evidence) console.log(`    evidence: ${chosen.evidence}`);
}
```

### 7) Print end-of-run summary
Right before writing the CSV (or right after), add:
```js
const secs = ((Date.now() - startedAt)/1000).toFixed(1);
console.log(`\n== Run Summary ==`);
console.log(`channels: ${channels.length}`);
console.log(`processed: ${nProcessed}, sparse: ${nSparse}, low_conf: ${nLowConf}, errors: ${nError}, assigned: ${nAssigned}`);
console.log(`elapsed: ${secs}s`);
```

### 8) CLI usage
- Verbose:
```bash
npm run fit:run -- --verbose=1
# or
node scripts/batch.run.js ... --verbose=1
```
- Quiet (default): omit the flag.
