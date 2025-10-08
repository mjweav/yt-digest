# YT‑Digest — Phase 5.3 Umbrella Patch (Coverage Tracking + Guardrails)
**Date:** 2025‑10‑08

Goal: Add **persistent metrics + guardrails** so we can raise coverage step‑by‑step (targeting long‑term ≈70%) without losing precision or re‑introducing noise. P5.3 **does not** change scoring logic; it adds reporting, thresholds, and fail‑fast checks you can run locally or in CI.

---

## What this adds
1) **Config file** `data/umbrella_config.json` — target ranges and locks.
2) **Metrics writer** (small code hooks) in `scripts/umbrella_fit.js` to emit per‑run stats.
3) **Metrics CLI** `scripts/metrics/umbrella_metrics.js` — validates a run against config, prints a summary, and returns a non‑zero exit if guardrails fail.
4) **Artifacts** saved to `/data` on each run:
   - `umbrella_metrics.json` (detailed per‑run stats)
   - `umbrella_metrics.csv` (appended history)
   - `umbrella_last.txt` (one‑line human summary for logs/PRs)

---

## A) New file — `data/umbrella_config.json`
> Add this file. Tweak ranges as we iterate upward on coverage.

```json
{
  "targets": {
    "coverage_min": 0.08,
    "coverage_max": 0.35,
    "median_margin_min": 0.18,
    "noise_rate_max": 0.001
  },
  "locks": {
    "require_margin_gate": true,
    "require_params": {
      "TITLE_WEIGHT": 1.6,
      "MARGIN_MIN": 0.10
    }
  },
  "notes": "Raise coverage_min as we dial in (e.g., 0.15 → 0.30 → 0.50 → 0.70). Keep noise_rate_max ≈ 0.001 (≈0.1%)."
}
```

---

## B) Edit — `scripts/umbrella_fit.js`
> After you finish building `umbrella_channels.csv`, add this **metrics emit** block. Adjust field names to match your actual structures if needed.

```js
// === Phase 5.3: metrics writer ===
const fs = require('fs');
const path = require('path');

function pct(n, d) { return d ? n / d : 0; }

function writeUmbrellaMetrics({ channelsPath, summaryPath, debugPath }) {
  const channelsCsv = fs.readFileSync(channelsPath, 'utf8').trim().split('
');
  const header = channelsCsv[0].split(',');
  const rows = channelsCsv.slice(1).map(line => {
    // naive CSV split; safe because our fields are simple. Replace with a tiny CSV parser if needed.
    const parts = line.split(',');
    const rec = {};
    header.forEach((h, i) => rec[h] = parts[i]);
    return rec;
  });

  const N = rows.length;
  const assignedRows = rows.filter(r => r.umbrellaLabel && !/^Unclassified/.test(r.umbrellaLabel));
  const A = assignedRows.length;
  const coverage = pct(A, N);

  // collect numeric margin/score
  const margins = assignedRows.map(r => parseFloat(r.margin)).filter(x => !Number.isNaN(x));
  const scores  = assignedRows.map(r => parseFloat(r.score)).filter(x => !Number.isNaN(x));

  function quantile(arr, q) {
    if (!arr.length) return NaN;
    const s = arr.slice().sort((a,b)=>a-b);
    const pos = (s.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return s[base + 1] !== undefined ? s[base] + rest * (s[base + 1] - s[base]) : s[base];
  }

  const medianMargin = quantile(margins, 0.5);
  const p25Margin = quantile(margins, 0.25);
  const p75Margin = quantile(margins, 0.75);
  const minMargin = Math.min(...margins, NaN);
  const maxMargin = Math.max(...margins, NaN);

  // basic noise scan from debug top3 (optional; if not present, defaults to 0)
  let noiseRate = 0;
  try {
    const dbg = JSON.parse(fs.readFileSync(debugPath, 'utf8'));
    const str = JSON.stringify(dbg).toLowerCase();
    noiseRate = /(\d{1,2}:\d{2}(?:am|pm)?|(19|20)\d{2}|1080p|4k|\d+fps|\d{1,2}[\/\-]\d{1,2})/i.test(str) ? 1 : 0;
  } catch { /* ignore */ }

  // echo params if present
  let params = {};
  try {
    const dbg = JSON.parse(fs.readFileSync(debugPath, 'utf8'));
    params = dbg.params || {};
  } catch { /* ignore */ }

  const metrics = {
    when: new Date().toISOString(),
    totals: { channels: N, assigned: A, coverage },
    margins: { median: medianMargin, p25: p25Margin, p75: p75Margin, min: minMargin, max: maxMargin },
    scores: { min: Math.min(...scores, NaN), max: Math.max(...scores, NaN) },
    noise: { rate: noiseRate },
    params
  };

  // write JSON
  const jsonPath = path.join('data', 'umbrella_metrics.json');
  fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));

  // append CSV history
  const histPath = path.join('data', 'umbrella_metrics.csv');
  const row = [
    metrics.when,
    N, A, coverage.toFixed(4),
    (medianMargin ?? NaN).toFixed(4),
    (p25Margin ?? NaN).toFixed(4),
    (p75Margin ?? NaN).toFixed(4),
    (minMargin ?? NaN).toFixed(4),
    (maxMargin ?? NaN).toFixed(4),
    noiseRate.toFixed(4),
    params.SCORE_MIN ?? '',
    params.MARGIN_MIN ?? '',
    params.TITLE_WEIGHT ?? '',
    params.patch ?? ''
  ].join(',');

  if (!fs.existsSync(histPath)) {
    fs.writeFileSync(histPath, 'when,channels,assigned,coverage,median_margin,p25_margin,p75_margin,min_margin,max_margin,noise_rate,SCORE_MIN,MARGIN_MIN,TITLE_WEIGHT,patch\n');
  }
  fs.appendFileSync(histPath, row + '\n');

  // one-liner for PRs / logs
  const summaryLine = `[Umbrella] coverage=${(coverage*100).toFixed(1)}% | median_margin=${(medianMargin||0).toFixed(3)} | noise=${(noiseRate*100).toFixed(1)}% | params=${JSON.stringify(params)}`;
  fs.writeFileSync(path.join('data', 'umbrella_last.txt'), summaryLine);
}

// Call it after writing umbrella files
writeUmbrellaMetrics({
  channelsPath: path.join('data','umbrella_channels.csv'),
  summaryPath:  path.join('data','umbrella_summary.csv'),
  debugPath:    path.join('data','umbrella_debug.json')
});
```

---

## C) New file — `scripts/metrics/umbrella_metrics.js`
> Standalone validator: reads `data/umbrella_metrics.json` and `data/umbrella_config.json`; prints a table and exits non‑zero if outside bounds.

```js
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function load(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function ok(flag, label) { return `${flag ? 'OK ' : 'FAIL'}  ${label}`; }

function main() {
  const metrics = load(path.join('data','umbrella_metrics.json'));
  const cfg     = load(path.join('data','umbrella_config.json'));

  const cov = metrics.totals.coverage || 0;
  const med = metrics.margins.median ?? 0;
  const noise = metrics.noise.rate ?? 0;

  // param locks (optional but recommended)
  const params = metrics.params || {};
  const locks = cfg.locks || {};
  let locked = true;
  if (locks.require_params) {
    for (const [k, v] of Object.entries(locks.require_params)) {
      if (params[k] !== v) locked = false;
    }
  }

  // guardrails
  const withinCoverage = cov >= cfg.targets.coverage_min && cov <= cfg.targets.coverage_max;
  const withinNoise    = noise <= cfg.targets.noise_rate_max;
  const withinMedian   = med >= cfg.targets.median_margin_min;

  // table
  console.log('=== Umbrella Metrics — Guardrail Check ===');
  console.log(`Date: ${metrics.when}`);
  console.log(`Channels: ${metrics.totals.channels}  Assigned: ${metrics.totals.assigned}  Coverage: ${(cov*100).toFixed(1)}%`);
  console.log(`Median margin: ${med.toFixed(3)}  p25: ${(metrics.margins.p25||0).toFixed(3)}  p75: ${(metrics.margins.p75||0).toFixed(3)}`);
  console.log(`Noise rate: ${(noise*100).toFixed(2)}%`);
  console.log(`Params: ${JSON.stringify(params)}`);
  console.log('---');
  console.log(ok(withinCoverage, `coverage in [${(cfg.targets.coverage_min*100).toFixed(0)}%, ${(cfg.targets.coverage_max*100).toFixed(0)}%]`));
  console.log(ok(withinMedian,   `median margin >= ${cfg.targets.median_margin_min}`));
  console.log(ok(withinNoise,    `noise <= ${cfg.targets.noise_rate_max}`));
  console.log(ok(locked,         `param locks respected`));

  const pass = withinCoverage && withinMedian && withinNoise && locked;
  process.exit(pass ? 0 : 2);
}

main();
```

> Make it executable: `chmod +x scripts/metrics/umbrella_metrics.js`

---

## D) Usage
After your normal build/run:
```bash
node scripts/umbrella_fit.js --channels data/channels.json --topics data/umbrella_topics.json

# Emit summary and validate against guardrails
node scripts/metrics/umbrella_metrics.js
cat data/umbrella_last.txt
tail -n 5 data/umbrella_metrics.csv
```

---

## E) Operating the ramp to 70%
- Start with cfg targets at **8–35%** coverage (matching P5.2 goals). Once we stabilize, raise `coverage_min` stepwise:
  - 0.08 → 0.15 → 0.30 → 0.50 → **0.70**
- Keep `median_margin_min` at **0.18** initially; revisit only if we add smarter features (e.g., phrase boosts, per‑umbrella synonyms, soft TF‑IDF backoff).
- Keep `noise_rate_max` at **~0.1%**; any non‑zero should be investigated before raising.

---

## F) CI (optional but recommended)
Add a job that runs after PR builds:
```bash
node scripts/umbrella_fit.js --channels data/channels.json --topics data/umbrella_topics.json
node scripts/metrics/umbrella_metrics.js  # fails PR if guardrails trip
```

---

## G) Commit
```bash
git add data/umbrella_config.json scripts/metrics/umbrella_metrics.js scripts/umbrella_fit.js data/umbrella_metrics.* data/umbrella_last.txt
git commit -m "feat(umbrella): Phase 5.3 — persistent metrics + guardrails for coverage ramp"
```
