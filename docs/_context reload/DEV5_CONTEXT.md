# YT-Digest — Phase 5 Context (Down & Dirty Classification)
Date: 2025-10-08

You are continuing work on the YT-Digest project. This doc gives the full context for Phase 5 so a fresh chat has everything it needs in one place.

---

## 1) Vision & User Promise
- Goal: Instantly organize a user’s YouTube subscriptions into obvious, useful topics without setup.
- Promise: “Good enough in one click.” High-precision single-level topics first; Unclassified is acceptable when confidence is low.
- Portability: No per-user training required; rules are portable-first, with optional user remap signals to improve over time.

## 2) What we built so far (quick map)
### A) AO (Auto-Organize) heuristics (server)
- Rule-based scoring per topic; governance (display cap, purity, minSize); debug rows with topScore/secondScore/margin.
- Artefacts: data/autoOrganize.metrics.json(.raw), data/autoOrganize.debug.json, CSVs via runmetrics.sh.

### B) LWL Harness (Like-With-Like) — Assistive
- Graph clustering on description/title tokens (no ML), labels derived from cluster terms.
- Status: Useful for discovery, but not our main path for Phase 5. We keep it for analysis.

### C) Umbrella Harness — Primary for Phase 5
- No ML. Title+description → hashed vector; compare to hand-crafted umbrella topics; pick best if above score/margin.
- Tunable knobs and seed lists; outputs clean CSVs (umbrella_*). This supersedes LWL for day-to-day classification in Phase 5.

Why we pivoted: AO rule-tuning + LWL labeling became “whack-a-mole”. Umbrella approach is transparent, precise, and fast to iterate.

## 3) Phase 5 Scope (what we’re doing now)
- Use Umbrella Harness to produce a portable, single-level topic per channel where confidence is high.
- Keep AO and LWL intact but do not change their internals (we can compare outputs).
- Focus on: thresholds, seed enrichment, token filtering, and a tiny batch reassigner later.

Out of scope for Phase 5: UI changes, governance refactors, sub-clusters.

## 4) Operating Principles (SOP)
- Do NOT load large /data/*.json into context. Use jq/rg to quote tiny excerpts.
- Always begin prompts with: “You are continuing work on YT-Digest (Phase 5).”
- Provide exact file paths.
- On completion: update changelog.md accordingly.

## 5) Inputs & Artefacts (on disk)
- Channels: data/channels.json (source)
- AO: data/autoOrganize.metrics.json(.raw), data/autoOrganize.debug.json
- AO CSVs: data/ao_cluster_summary.csv, data/ao_channels_detailed.csv, data/ao_channels_lowmargin.csv
- LWL: data/lwl_summary.csv, data/lwl_channels.csv, data/lwl_clusters.json
- Umbrella: scripts/umbrella_fit.js, data/umbrella_topics.json, outputs: umbrella_summary.csv, umbrella_channels.csv, umbrella_debug.json

## 6) Validation we care about (Phase 5)
- Precision over recall: Only assign when score ≥ SCORE_MIN and margin ≥ MARGIN_MIN.
- Sanity: “Timestamp noise” is filtered; top3 in debug should not contain date/time/4k/1080p tokens.
- Reports: We eyeball umbrella_summary.csv + umbrella_channels.csv. Unclassified is OK.

## 7) “Knobs” we tune (see KNOBS_REFERENCE)
- SCORE_MIN, MARGIN_MIN, TITLE_WEIGHT
- Token filters (stopwords, generics, timestamp/number filters)
- umbrella_topics.json seed enrichment (add a few, portable, high-signal terms)

## 8) Decision Record (abridged)
- Keep taxonomy flat. Sub-clusters deferred.
- Governance stays; AO used as reference, not as the primary classifier this phase.
- Umbrella supersedes LWL for classification outputs; LWL remains for discovery/QC.

## 9) Next concrete tasks
- T1: Apply the umbrella tune patch (thresholds + timestamp filter + seed enrich).
- T2: Re-run harness; inspect umbrella_summary.csv and 20 sample rows of umbrella_channels.csv.
- T3: If needed, small param sweep: 2–3 values each for SCORE_MIN, MARGIN_MIN, TITLE_WEIGHT, record a short CSV.
- T4: Prepare the batch reassigner design (CSV → overrides), but implement next.

## 10) Handy commands
```bash
# Umbrella
node scripts/umbrella_fit.js --channels data/channels.json --topics data/umbrella_topics.json
head -n 10 data/umbrella_summary.csv
head -n 10 data/umbrella_channels.csv
jq '.params' data/umbrella_debug.json

# Greps
rg -n '^(AI|Tech|Coding|News|Video Editing),' data/umbrella_summary.csv
rg -n '\b(\d{1,2}:\d{2}(am|pm)?|\d{4}|1080p|4k|\d+fps|\d{1,2}[\/\-]\d{1,2})\b' data/umbrella_debug.json || true
```

---

TL;DR for a fresh assistant
- Use the Umbrella Harness to assign obvious topics with high confidence; otherwise leave Unclassified.
- Tune only the knobs listed. Do not touch UI or AO internals.
- Keep outputs small (CSVs) and update CHANGELOG.md after each microstep.
