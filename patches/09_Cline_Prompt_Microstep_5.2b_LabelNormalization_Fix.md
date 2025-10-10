# YT‑Digest — Cline Prompt (Microstep 5.2b)
**You are continuing development on the YT‑Digest project.**  
**Task:** Microstep 5.2b — Canonical Label Enforcement & Mojibake Hardening  
**Important:** avoid loading large `/data/*.json` files into memory. Work only with the files explicitly listed below.

---

## Scope
Fix verbose label bleed‑through by **enforcing canonical parent labels** from the labelbook at write‑out time, and **harden** against mojibake and separator echoes returned by the LLM. Add unit tests and run validation.

This microstep must be **atomic** and safe to commit.

---

## Files to Modify / Add
- `batch.run.js` (runner — where LLM choice is normalized and results are written)
- `lib/labelSanitizer.js` (new helper; pure function)
- `tests/labelSanitizer.spec.js` (new unit tests; Node test runner or vitest/jest — use what the repo already uses; if none, add a tiny node-based test harness under `npm test`)
- (No changes to `labelbook.json` — parent labels are already canonical and locked)

---

## Requirements

### 1) Create a robust label sanitizer
Add `lib/labelSanitizer.js` exporting:
```js
/**
 * normalizeLabel(raw, allowedSet)
 *  - Fix common UTF-8 mojibake for dashes: '‚Äî','â€”','â€“','â€•' → proper '—' or '–'
 *  - Trim leading/trailing whitespace
 *  - Truncate at first separator among: em dash (—), en dash (–), colon (:), middle dot (·)
 *  - Cap to <= 3 words (keep first 1–3 words)
 *  - Case-normalize to Title Case (preserve common acronyms: AI, HTML, CSS, SQL)
 *  - If result case-insensitively equals an item from allowedSet → return the canonical casing from allowedSet
 *  - If not in allowedSet → return null (caller will decide Unclassified low-confidence)
 */
```
Implementation notes:
- Replace mojibake **before** splitting on separators.
- Separator regex: `[—–:\u00b7]`
- Title case: split on whitespace; capitalize first letter unless the token is all‑caps (e.g., AI, GPU). Keep “&” if present.
- `allowedSet` contains **canonical parent names** from labelbook and/or shortlist construction; never pass verbose definitions here.

### 2) Enforce canonical label in the runner
In `batch.run.js` where we currently have the model’s `result.label` and a shortlist `list`:
- Build `allowed = new Set(list.map(x => x.label))` (must be **canonical names only**).
- Call `picked = normalizeLabel(result.label, allowed)`.
- If `picked === null` → set `picked = "Unclassified (low confidence)"` and optionally reduce confidence to a floor (e.g., 0.51) to reflect uncertainty.
- **Assign back**: `result.label = picked` so all downstream consumers (CSV/JSON) write canonical names.
- When constructing the final `chosen` object, use `result.label` (now canonical).

**Also ensure** any shortlist building code that previously concatenated `"name — definition"` for readability keeps that for the **prompt text only**, but the programmatic `list` array used for validation contains **only** the canonical `name` values.

### 3) Wire-up tests
Add `tests/labelSanitizer.spec.js` with cases:
- Echoed verbose strings → canonical:
  - `"Technology — software, hardware, AI, computing, and devices."` → `Technology`
  - `"Business — entrepreneurship, marketing, and business strategies."` → `Business`
  - `"Music — music performance, lessons, production."` → `Music`
- Mojibake dash variants:
  - `"Finance ‚Äî personal finance..."` → `Finance`
  - `"News â€” journalism..."` → `News`
  - `"Photography â€“ gear..."` → `Photography`
- Stripping after separators:
  - `"Automotive: cars, motorcycles"` → `Automotive`
  - `"History · analysis"` → `History`
- Word cap:
  - `"Tech Tutorials General"` → `Tech Tutorials General` (3 words kept)
  - `"Deep Learning Research Topics"` → `Deep Learning Research` (truncated to 3 words)
- Case reconciliation vs allowedSet:
  - With `allowedSet = {"AI", "News", "Technology"}`;
    - `"technology"` → `Technology`
    - `"ai"` → `AI`

### 4) Add an npm test script
If the repo already has a test framework, use it. If not, add a minimal harness:
- Add `npm test` script that runs the spec (e.g., vitest or a tiny Node script that asserts and exits non‑zero on failure).

### 5) Validation (Expected)
- **Unit tests pass**: `npm test` exits 0.
- Run a dry run of the batch on a **small sample** (no large data loads) to exercise the path that writes the CSV/JSON:
  - Verify there are **no labels containing separators** like `—`, `:`, or `·`.
  - Verify there are **no labels longer than 3 words**.
  - Verify no mojibake sequences remain: `‚Äî`, `â€”`, `â€“`, `â€•`.
- Confirm any previously verbose labels now appear as their parent names (1–3 words) in the output CSV (e.g., `fitting_results.csv`).

---

## Acceptance Criteria
1. All outputs (CSV/JSON) contain **only canonical parent labels** as defined by the labelbook / shortlist canonical names.
2. No mojibake artifacts in labels; no labels containing `—`, `:`, `·` in their stored value.
3. Labels limited to **≤3 words**.
4. If the LLM returns a label not matching allowedSet, it’s coerced to **Unclassified (low confidence)** with a warning logged.
5. `npm test` passes with the provided spec.

---

## Deliverables
- Updated `batch.run.js`
- New `lib/labelSanitizer.js`
- New `tests/labelSanitizer.spec.js`
- Proof screenshot or log excerpt showing clean labels in a small run output
- Short changelog entry appended to `CHANGELOG.md`

---

## Notes
- Do **not** alter the taxonomy in `labelbook.json`.
- Keep this change isolated; no refactors beyond what is required.
- Commit as: `feat(ao): enforce canonical labels, fix mojibake, add sanitizer & tests (Microstep 5.2b)`

---

## Expected Validation (copy back to chat)
- Paste the `npm test` results.
- Paste a 10–20 line excerpt of the generated CSV showing corrected labels.
- Report any residual edge cases the sanitizer caught (with original → normalized examples).
