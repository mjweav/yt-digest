You are continuing work on the YT-Digest project (Phase 5).
Standalone Patch — 2025-10-07_phase5-umbrella-tune-v1

Essentials SOP
0) Do NOT load large /data/*.json into context; use jq/rg excerpts only.
1) Work only on:
   - scripts/umbrella_fit.js
   - data/umbrella_topics.json
2) Make the exact edits below (surgical; no refactors).
3) On completion: update changelog.md accordingly (concise entry with date + patch name).

Context
- We want higher-confidence umbrella assignments and to remove timestamp/date/number noise from scoring.
- Also enrich a few umbrella seed lists with portable tokens.

Objective
- Raise confidence thresholds; boost title impact; filter timestampy tokens; enrich seeds.
- Keep everything portable; no UI or AO engine changes.

---
Changes

File: scripts/umbrella_fit.js
1) Tune knobs — set these constants near the top:
```js
const TITLE_WEIGHT = 1.6;   // was 1.4
const SCORE_MIN    = 0.24;  // was 0.18
const MARGIN_MIN   = 0.10;  // was 0.06
```

2) Tokenizer: filter timestamps/dates/numerics — in tokenize(text) just after const out = []; insert this helper and guards:

```js
// Helper: is token time/date/number noise?
const TIME_NUM_RE = /^(\d(1, 2):\d2(?:am|pm)?|\d(1, 2)(?:am|pm)|\d4|\d(1, 2)[\/\-]\d(1, 2)(?:[\/\-]\d(2, 4))?|\d+(?:k|p|fps)?)$/i;

for (const t of toks) {
  const tt = t.replace(/^[\-_]+|[\-_]+$/g, "");
  if (!tt) continue;
  if (STOPWORDS.has(tt)) continue;
  if (GENERICS.has(tt)) continue;
  if (tt.length < 3) continue;
  if (/^\d+$/.test(tt)) continue;                // pure numbers
  if (TIME_NUM_RE.test(tt)) continue;             // times, dates, 4k/1080p/etc.
  out.push(tt);
}
```

(Keep the rest of the function unchanged.)

3) Optionally expand GENERICS (same file, the GENERICS Set). Add these tokens to the array:
```js
"live","stream","season","episode","ep","premiere","now","today","tonight"
```

---
File: data/umbrella_topics.json
- Edit the topics entries to append the following seeds:

AI add: nlp, diffusion, transformers, autonomous, robotics
Tech add: chip, silicon, gpu, ssd, teardown
Coding add: backend, frontend, compiler, algorithm, data structures
News add: bulletin, briefing, nightly, correspondents

(Keep existing seeds; just append these terms as additional strings.)

---
Validation
1) Re-run harness:
```bash
node scripts/umbrella_fit.js --channels data/channels.json --topics data/umbrella_topics.json
```
2) Quick checks:
```bash
head -n 10 data/umbrella_summary.csv
head -n 10 data/umbrella_channels.csv
jq '.params' data/umbrella_debug.json
# scan for timestampy tokens in top3:
rg -n '\b(\d{1,2}:\d{2}(am|pm)?|\d{4}|1080p|4k|\d+fps|\d{1,2}[\/\-]\d{1,2})\b' data/umbrella_debug.json || true
```
3) Accept if:
- Score/margin params reflected in .params
- Summary shows fewer shaky assignments; top3 strings in debug do not contain timestamp/date/number junk.

Commit
chore(umbrella): tighten thresholds, filter timestamp tokens, enrich seeds; update changelog.md accordingly
