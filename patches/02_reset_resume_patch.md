
# Patch 02 — Fresh Run / Resume Controls (avoid buildup across runs)

**Goal:** Successive runs should not "accumulate" unintended work. Add flags to control state:
- `--fresh=1`  → rotate previous assignment file and start clean
- `--resume=1` → skip channels already assigned to a non-Unclassified label, unless confidence uplift threshold is met

## Files to edit
- `scripts/batch.run.js`

## Changes

### 1) Parse flags
After args parsing:
```js
const fresh = (args.fresh === '1' || args.fresh === 'true');
const resume = (args.resume === '1' || args.resume === 'true');
```

### 2) Fresh rotation (before processing)
Right after we define paths and load labelbook, add:
```js
// Rotate previous assignments if --fresh
if (fresh) {
  if (fs.existsSync(outJsonl)) {
    fs.copyFileSync(outJsonl, prevJsonl);
    fs.writeFileSync(outJsonl, ""); // truncate
    console.log(`[fresh] Rotated ${outJsonl} -> ${prevJsonl} and cleared current.`);
  }
  if (fs.existsSync(outCsv)) {
    const backupCsv = outCsv.replace(/\.csv$/, `.prev.csv`);
    fs.copyFileSync(outCsv, backupCsv);
    console.log(`[fresh] Backed up ${outCsv} -> ${backupCsv}`);
  }
}
```

### 3) Resume short-circuit
Inside the for-loop, **before triage**, add:
```js
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
```

### 4) CLI usage
- Start clean and rotate previous outputs:
```bash
npm run fit:run -- --fresh=1
```
- Resume (reuse prior accepted labels):
```bash
npm run fit:run -- --resume=1
```
- Combine:
```bash
npm run fit:run -- --fresh=1 --resume=1
```
