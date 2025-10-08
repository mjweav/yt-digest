# YT‑Digest — Phase 5.2 Umbrella Patch (Recall bump, precision kept)
**Date:** 2025‑10‑08

## Why this patch
Phase 5.1 landed **very clean but very sparse** assignments (≈3.2% coverage on 503 channels), with **healthy margins** (mean ≈0.27) and **no timestamp/number noise** observed. That hits our precision goal, but misses MVP “good‑enough coverage.”

**P5.2 objective:** modestly increase coverage while keeping margin ≥ 0.10 and preserving the “no junk” guarantee.

---

## Changes at a glance
- **Thresholds:** lower `SCORE_MIN` from **0.24 → 0.22** (keep `MARGIN_MIN=0.10`, `TITLE_WEIGHT=1.6`).
- **Phrase boosts (surgical):** add a tiny per‑umbrella phrase map that gives a small bump when domain‑defining phrases appear (e.g., “final cut”, “davinci resolve”, “official trailer”, “guitar lesson”). This raises obvious channels without broadening seeds globally.
- **Generics/stop:** expand a few platform fillers (`official`, `ep`, `episode`, `season`, `live`) to further reduce noise.
- **Seeds:** append 1–3 portable, high‑signal tokens to a few umbrellas (no brand dumps).

---

## File A — scripts/umbrella_fit.js (edits)

1) **Knobs** (top of file):
```js
const TITLE_WEIGHT = 1.6;
const SCORE_MIN    = 0.22;   // ↓ from 0.24 to improve coverage slightly
const MARGIN_MIN   = 0.10;   // keep margin gate
```

2) **Optional: expand GENERICS/STOPWORDS** (where you define them):
```js
// Add to GENERICS (append; do not replace existing):
"official","live","stream","season","episode","ep","premiere","now","today","tonight"
```

3) **Phrase boosts (new, surgical):**
```js
// --- Phase 5.2: domain phrases that should nudge obvious topic matches ---
const PHRASE_BOOSTS = {
  "Video Editing": ["final cut","davinci resolve","after effects","premiere pro","color grading"],
  "Photography":   ["lightroom","photoshop","raw photo","camera raw"],
  "Music":         ["drum lesson","guitar lesson","piano tutorial","music theory"],
  "Gaming":        ["gameplay","walkthrough","speedrun"],
  "Film & TV":     ["official trailer","behind the scenes","movie trailer"]
};

const PHRASE_WEIGHT = 0.50; // small, just enough to lift obvious cases

function applyPhraseBoosts(text, topicScores) {
  const hay = (text || "").toLowerCase();
  for (const [topic, phrases] of Object.entries(PHRASE_BOOSTS)) {
    for (const p of phrases) {
      if (hay.includes(p)) {
        topicScores[topic] = (topicScores[topic] || 0) + PHRASE_WEIGHT;
      }
    }
  }
}
```

4) **Integrate phrase boosts inside scoring flow** (near/inside `chooseUmbrella` logic, after you compute base scores but **before** you sort and gate):
```js
function chooseUmbrella(channel, topicMap) {
  // Base scores (bag-of-words with title boost)
  const base = Object.fromEntries(
    Object.entries(topicMap).map(([topic, lex]) => [
      topic,
      scoreAgainstTopic(channel, new Set(lex))
    ])
  );

  // Phase 5.2: apply phrase boosts using full text context
  const fullText = `${channel.title || ""} ${channel.description || ""}`;
  applyPhraseBoosts(fullText, base);

  // Rank with updated scores
  const scores = Object.entries(base)
    .map(([topic, score]) => ({ topic, score }))
    .sort((a, b) => b.score - a.score);

  const winner   = scores[0] || { topic: "Unclassified", score: 0 };
  const runnerUp = scores[1] || { topic: "—", score: 0 };
  const margin   = winner.score - runnerUp.score;

  if (winner.score >= SCORE_MIN && margin >= MARGIN_MIN) {
    return { topic: winner.topic, score: winner.score, margin };
  }
  return { topic: "Unclassified", score: winner.score, margin };
}
```

> Debug: keep emitting `.params` and consider also echoing `patch:"Phase5.2"`.


---

## File B — data/umbrella_topics.json (append only)
Keep it lean and non‑brand‑y. Append a few portable tokens:

```json
{
  "Video Editing": ["timeline","proxy","render"],
  "Photography":   ["aperture","shutter","iso"],
  "Music":         ["drums","guitar","piano"],
  "Gaming":        ["game","games","level"],
  "Film & TV":     ["cinema","trailer","scene"]
}
```

*(Note: keep prior seeds from Phase 5.1; do not remove anything.)*

---

## Run
```bash
node scripts/umbrella_fit.js   --channels data/channels.json   --topics   data/umbrella_topics.json
```

## Validate
- Coverage target: **≥ 8–15%** (up from ~3.2%), margins remain **≥ 0.10** (median ideally ≥ 0.18).
- Noise: still **zero** timestamp/date/4k tokens in debug `top3`.
- Spot checks: obvious creator verticals (Video Editing / Photography / Film & TV / Music / Gaming) should now land.

Quick peeks:
```bash
jq '.params' data/umbrella_debug.json
head -n 10 data/umbrella_summary.csv
head -n 20 data/umbrella_channels.csv
rg -n '(\d{1,2}:\d{2}(am|pm)?|(19|20)\d{2}|1080p|4k|\d+fps|\d{1,2}[\/\-]\d{1,2})' data/umbrella_debug.json || true
```

---

## Optional micro‑sweep (fast)
Try the grid and record coverage / median margin:
- `SCORE_MIN`: 0.22, **0.23**, 0.24
- `MARGIN_MIN`: **0.10**, 0.12
- `PHRASE_WEIGHT`: 0.4, **0.5**, 0.6

Simple CSV to track:
```
score_min,margin_min,phrase_w,assigned,count,coverage,median_margin
0.22,0.10,0.50,XX,503,YY%,0.XX
```

---

## Commit
```bash
git add scripts/umbrella_fit.js data/umbrella_topics.json CHANGELOG.md
git commit -m "feat(umbrella): Phase 5.2 — lower SCORE_MIN, add phrase boosts, expand seeds"
```
