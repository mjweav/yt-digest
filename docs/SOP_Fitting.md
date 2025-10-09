# SOP — AI Single-Label Fitting (CommonJS)

## What this does
- Classifies each channel into **exactly one** umbrella from a curated labelbook.
- Uses **world knowledge** + title/description; closed-set single choice.
- Early triage drops low-info channels to `Unclassified (sparse)`.
- Sticky labels prevent flip-flops unless confidence improves by ≥ 0.15.

## Run
node scripts/batch.run.js --channels data/channels.json --labels data/labelbook.json --out data/fitting_results.csv --jsonl data/assignments.jsonl --anchors data/anchors.json --model gpt-4o-mini

## Metrics
node scripts/metrics.summary.js --jsonl data/assignments.jsonl --prev data/assignments.prev.jsonl

## Env
OPENAI_API_KEY must be set. Optional: OPENAI_BASE_URL.

## Guardrails
- temp=0, top_p=1, JSON-only response.
- Confidence < 0.40 → `Unclassified (low confidence)`.
- Label must be in shortlist; else snap to shortlist[0].
- Flip-rate > 3% without confidence uplift ≥ 0.15 → investigate.
