# YT‑Digest — Phase 5.1 Umbrella Tune Patch (Precision-first)

**Date:** 2025‑10‑08  
**Scope:** Single‑level “good‑enough” umbrella assignment via `scripts/umbrella_fit.js` (no ML).  
**Intent:** Improve precision and reduce timestamp/number noise. Prefer `Unclassified` over weak matches.

---

## TL;DR — Knobs & Rules
- `SCORE_MIN = 0.24`
- `MARGIN_MIN = 0.10`
- `TITLE_WEIGHT = 1.60`
- **Noise filter:** Drop timestamps, dates, resolutions, and bare numbers from tokenization.

If your repo already contains a `2025-10-07_phase5-umbrella-tune-v1_standalone.md`, this **v5.1 supersedes it** and fixes a brittle regex edge case by switching to explicit checks.

---

## Files to Edit
1) `scripts/umbrella_fit.js` — set thresholds/weight and add noise token filter.  
2) `data/umbrella_topics.json` — append minimal high‑signal seeds (AI, Tech, Coding, News).

---

## Patch A — scripts/umbrella_fit.js

> Insert or update the following sections. If the file doesn’t exist, create it accordingly where your builder expects it.

```js
// --- Phase 5.1 tuning knobs ---
const SCORE_MIN    = 0.24;  // precision floor
const MARGIN_MIN   = 0.10;  // winner - runnerUp minimum
const TITLE_WEIGHT = 1.60;  // title tokens count more

// --- token noise filters ---
// Drop timestamps (e.g., 10:30, 1:02:15, 7pm), durations (10m, 2h30m), dates (2024, 12/31/2024),
// resolutions/fps (1080p, 4k, 60fps), and bare numbers.
function isNoiseToken(t) {
  if (!t) return true;
  const s = t.toLowerCase();

  // timestamps / times / HH:MM(:SS) with optional am/pm
  if (/^\d{1,2}:\d{2}(:\d{2})?([ap]m)?$/.test(s)) return true;

  // durations like 2h, 2h30m, 15m, 30m20s
  if (/^\d+h(\d+m)?$/.test(s) || /^\d+m(\d+s)?$/.test(s)) return true;

  // dates / years
  if (/^(19|20)\d{2}$/.test(s)) return true;                                // years
  if (/^\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?$/.test(s)) return true;   // mm/dd(/yyyy) or dd-mm(-yyyy)

  // numeric junk / resolutions / fps
  if (/^\d+(k|p|fps)$/.test(s)) return true;  // 1080p, 4k, 60fps
  if (/^\d+$/.test(s)) return true;           // bare numbers

  return false;
}

function tokenize(text) {
  return (text || "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .filter(tok => !isNoiseToken(tok));
}

// Score a channel against a topic lexicon (bag-of-words with title boost)
function scoreAgainstTopic({ title, description }, topicLexicon) {
  const titleTokens = tokenize(title);
  const descTokens  = tokenize(description);

  const bag = new Map();
  for (const t of titleTokens) bag.set(t, (bag.get(t) || 0) + TITLE_WEIGHT);
  for (const t of descTokens) bag.set(t, (bag.get(t) || 0) + 1);

  let score = 0;
  for (const term of topicLexicon) {
    score += (bag.get(term) || 0);
  }
  return score;
}

// Choose best umbrella with margin gating
function chooseUmbrella(channel, topicMap) {
  const scores = Object.entries(topicMap).map(([topic, lex]) => ({
    topic,
    score: scoreAgainstTopic(channel, new Set(lex))
  })).sort((a, b) => b.score - a.score);

  const winner   = scores[0] || { topic: "Unclassified", score: 0 };
  const runnerUp = scores[1] || { topic: "—", score: 0 };

  const margin = winner.score - runnerUp.score;
  if (winner.score >= SCORE_MIN && margin >= MARGIN_MIN) {
    return { topic: winner.topic, score: winner.score, margin };
  }
  return { topic: "Unclassified", score: winner.score, margin };
}

// When building debug, also emit params so we can assert the run used P5.1
function getRunParams() {
  return { SCORE_MIN, MARGIN_MIN, TITLE_WEIGHT, patch: "Phase5.1" };
}
```

> Ensure your harness writes `getRunParams()` into `data/umbrella_debug.json` under a `params` key.

---

## Patch B — data/umbrella_topics.json

> Keep this lean; do not dump giant dictionaries here.

```json
{
  "AI":     ["ai", "machine", "learning", "nlp", "diffusion", "transformers", "autonomous", "robotics"],
  "Tech":   ["tech", "hardware", "chip", "silicon", "gpu", "ssd", "teardown"],
  "Coding": ["coding", "programming", "backend", "frontend", "compiler", "algorithm", "data", "structures"],
  "News":   ["news", "bulletin", "briefing", "nightly", "correspondents"]
}
```

---

## Run
```bash
node scripts/umbrella_fit.js   --channels data/channels.json   --topics   data/umbrella_topics.json
```

---

## Validation (acceptance criteria)
1. `data/umbrella_debug.json` → `.params` shows:
   ```json
   {"SCORE_MIN":0.24,"MARGIN_MIN":0.10,"TITLE_WEIGHT":1.6,"patch":"Phase5.1"}
   ```
2. **No timestamp/date/number junk** appears in any “top‑3 tokens” or similar debug fields.
3. `data/umbrella_summary.csv` looks sparse but clean (precision over recall).
4. `data/umbrella_channels.csv` shows high‑signal channels assigned; borderline go to `Unclassified`.

Quick peeks:
```bash
jq '.params' data/umbrella_debug.json
head -n 10 data/umbrella_summary.csv
head -n 10 data/umbrella_channels.csv
```

---

## Rollback / Tune Notes
- If we over‑pruned (too many `Unclassified`): lower `SCORE_MIN` to **0.22** (keep `MARGIN_MIN` at **0.10**).
- If noise leaks remain: widen patterns **surgically** (add a new `if (...) return true;` to `isNoiseToken`).

---

## Cline Prompt (ready to paste)
You are continuing work on the YT‑Digest project, Phase 5.1 (precision‑first umbrella assignment).

Task: Implement P5.1 knobs and noise filtering in `scripts/umbrella_fit.js` and add minimal seeds to `data/umbrella_topics.json`.

Constraints:
- Set `SCORE_MIN=0.24`, `MARGIN_MIN=0.10`, `TITLE_WEIGHT=1.6`.
- Implement `isNoiseToken()` and `tokenize()` exactly as specified to drop timestamps/dates/resolutions/bare numbers.
- Do not load large `/data/*.json` into context; use tiny `jq` excerpts only if needed.

Run:
- node scripts/umbrella_fit.js --channels data/channels.json --topics data/umbrella_topics.json

Validate:
- data/umbrella_debug.json → `.params` matches P5.1.
- No timestamp/date/number junk in debug token lists.
- umbrella_summary.csv and umbrella_channels.csv favor precision (more Unclassified is OK).

Finally:
- Update CHANGELOG.md with “Phase 5.1 — thresholds + noise filter” and list touched files.
