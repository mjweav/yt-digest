
# Patch 04 — Labelbook Expansion Workflow (using first output)

**Goal:** Use your first `fitting_results.csv` to expand and sharpen umbrellas before the next run.

## Inputs
- `data/fitting_results.csv` (first run)
- `data/assignments.jsonl` (for evidence & shortlist count)
- Current `data/labelbook.json`

## Quick Triage
1) **Sort by label** and scan these buckets first:
   - `Unclassified (low confidence)` — look for repeated terms/brands → candidate umbrellas or alias adds.
   - `Unclassified (sparse)` — ignore for now (low-info inputs).
2) **Check top frequent umbrellas** (from `metrics.json`):
   - If one label hoards a lot with **low median confidence**, it’s too broad → **split** or add exclusions.

## How to expand (minimal edits, big wins)
- For **each umbrella** you add or adjust, write:
  - `name` (1–3 words, generic; avoid brand names),
  - `definition` (one sentence),
  - `inclusion` (1 line),
  - `exclusion` (1 line),
  - `aliases` (array of common terms/brands),
  - `examples` (1–2 well-known channels).
- Keep **siblings separable** by adding one exclusion that references the sibling:
  - *Video Editing* — exclude cinematography; *Cinematography* — exclude editing/color tools.

## Where to look in your CSV
- **Title clues:** recurring nouns (e.g., blender, resolve, fortnite, nfl, keto, crypto).
- **Evidence field:** short justification text can reveal the brand/entity model relied on.
- **Shortlist count:** if small and wrong, add aliases to pull in the right umbrella next time.

## Acceptance checklist for each new/edited umbrella
- Name is generic (≤3 words).
- Definition separates it from siblings.
- Inclusion/exclusion written in plain English.
- 3–6 good aliases (terms, tools, brands) to help shortlisting.
- 1–2 examples (famous channels).

## Process
1) Make edits in `data/labelbook.json`.
2) Validate:
   - `node -e "console.log(require('./scripts/labelbook.schema.js').validateLabelBook(require('./data/labelbook.json')))"`
   - Expect `{ ok: true }`.
3) Rerun fitting:
   - `npm run fit:run -- --fresh=1 --resume=1 --verbose=1`
4) Review new `metrics.json` + CSV.
5) Iterate until:
   - flip-rate < 3%,
   - coverage (non-sparse) ~100%,
   - median confidence per umbrella ≥ 0.55.

## Notes from your first metrics
From your sample metrics:
- Total 1,395; coverage ≈ 86.95%; `Unclassified (low confidence)` was the largest bucket (439).
- Strong next targets for umbrellas/aliases: **Education**, **Lifestyle**, **Technology**, **News**, **Music**, **Photography**, **Video Editing**, **Film & TV**.
Focus first on reducing `Unclassified (low confidence)` by adding the obvious umbrellas/aliases seen in those rows.
