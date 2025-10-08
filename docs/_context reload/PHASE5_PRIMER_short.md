# YT-Digest — Phase 5 Primer (Short Handoff)

You are continuing work on the YT-Digest project (Phase 5).
Objective: down-and-dirty umbrella classification with no ML, using the umbrella_fit.js harness; LWL is assistive. Keep the UI and AO engine unchanged for now.

---

## What we already have on disk
- AO (governed/raw): data/autoOrganize.metrics.json, .raw.json, data/autoOrganize.debug.json
- AO CSVs: data/ao_cluster_summary.csv, data/ao_channels_detailed.csv, data/ao_channels_lowmargin.csv
- LWL outputs: data/lwl_summary.csv, data/lwl_channels.csv, data/lwl_clusters.json
- Umbrella harness: scripts/umbrella_fit.js, data/umbrella_topics.json
- Umbrella outputs: data/umbrella_summary.csv, data/umbrella_channels.csv, data/umbrella_debug.json

We will not paste large JSON blobs into prompts. Validation will use small CSVs and jq/rg excerpts.

---

## Phase 5 Goals
1) Produce a portable, single-level umbrella assignment that is "good enough" out-of-the-box.
2) Prefer precision over recall: high-confidence assignments only; else Unclassified.
3) Provide knobs for quick tuning; capture results in CSV for fast iteration.
4) Add simple batch reassigner later (from umbrella CSV -> overrides), not in this pass.

---

## Knobs to tune (in scripts/umbrella_fit.js)
- SCORE_MIN -> default 0.18 (raise to 0.24)
- MARGIN_MIN -> default 0.06 (raise to 0.10)
- TITLE_WEIGHT -> default 1.4 (raise to 1.6)
- Tokenizer noise filter: drop timestamp/date/numbery tokens (e.g., 10:30am, 2024, 12/31, 1080p, 4k).

## Seed enrichment (in data/umbrella_topics.json)
Add just a few high-signal words:
- AI: nlp, diffusion, transformers, autonomous, robotics
- Tech: chip, silicon, gpu, ssd, teardown
- Coding: backend, frontend, compiler, algorithm, data structures
- News: bulletin, briefing, nightly, correspondents

---

## Cline Prompt SOP (Phase 5)
0) Do not load large /data/*.json into context; use jq/rg excerpts only.
1) Include: "You are continuing work on the YT-Digest project (Phase 5)."
2) Provide exact file paths.
3) On completion: update changelog.md accordingly.

---

## Run commands
```bash
# Umbrella harness (re-run after any edits)
node scripts/umbrella_fit.js --channels data/channels.json --topics data/umbrella_topics.json

# Quick peeks
head -n 10 data/umbrella_summary.csv
head -n 10 data/umbrella_channels.csv
jq '.params' data/umbrella_debug.json
```

## Acceptance (for this phase)
- Umbrella summary shows clean, obvious umbrellas (even if fewer assigned).
- No timestamp junk in top3 debug strings.
- CSVs look sensible for a first "good enough" pass.
