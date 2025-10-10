# YT-Digest — Cline Prompt (Microstep 5.2c)
**You are continuing development on the YT-Digest project.**  
**Task:** Switch to an **ID-based shortlist return contract** and reduce the label sanitizer to a minimal Unicode dash fixer. Add strict validation + unit tests.  
**Important:** Avoid loading large `/data/*.json` files into memory. Work only with the files explicitly listed below.

---

## Goal
Eliminate label “noise” and verbose/malformed outputs by making the model return a **stable `choice_id`** from an enum, then mapping `choice_id → canonical label` in code. The sanitizer remains only as a safety net for Unicode dash normalization (no truncation, no word-capping).

This should **remove the root cause** of `auto-coerced invalid label output` and mojibake-related bleed-through.

---

## Files to Modify / Add
- `labelbook.json` (add stable `id` per umbrella if missing; do **not** rename existing parent labels)
- `lib/choices.js` (new; builds the shortlist array for prompts: `{ id, label, desc, anchors }`)
- `lib/validateChoice.js` (new; strict validator for model output `{ choice_id, confidence, rationale? }`)
- `batch.run.js` (update prompt construction, model call, parsing, and CSV/JSON write-out to use `choice_id`)
- `lib/labelSanitizer.js` (simplify: minimal Unicode dash normalization only)
- `tests/choiceContract.spec.js` (new; unit tests for the ID contract, validator, and mapping)
- `tests/sanitizerMinimal.spec.js` (new; unit tests for dash normalization only)
- Keep prior tests; remove/adjust any that depended on truncating labels in the sanitizer.

---

## Requirements

### 1) Labelbook IDs
Add an `id` per umbrella (stable slug). Example:
```json
{
  "name": "Technology",
  "id": "technology",
  "desc": "software, hardware, AI, computing, devices",
  "aliases": ["Tech", "Gadgets"]
}
```
Rules:
- `id` must be kebab/lowercase alphanum + hyphens only (e.g., `health-fitness`).
- Never change IDs once assigned; labels can change in the future without breaking data.

### 2) Build machine & human views of choices
Add `lib/choices.js`:
```js
// choices.js
import fs from "node:fs";
export function loadChoices(labelbookPath = "labelbook.json") {
  const lb = JSON.parse(fs.readFileSync(labelbookPath, "utf8"));
  // Return a **small** array of parent umbrellas only, each with: id, label, desc, anchors?
  return lb.map(x => ({
    id: x.id,
    label: x.name,
    desc: x.desc || "",
    anchors: x.anchors || []
  }));
}
```
- **Human view** (prompt): render `label + desc + anchors`.
- **Machine list** (validation): an enum of **IDs only**.

### 3) Prompt contract (strict)
Ask the model to choose **one** of the given IDs and return **JSON only**:
```json
{
  "choice_id": "<one-of: technology|music|news|...>",
  "confidence": 0.0-1.0,
  "rationale": "<optional, <= 30 words>"
}
```
- Use temperature `0`.
- Include a short example (few-shot) where the “obvious-looking” label is *not* the correct one to force definition-driven reasoning.
- Include an **Unclassified** path in the enum: `unclassified`.

### 4) Parsing & Validation
Add `lib/validateChoice.js`:
```js
export function validateChoice(jsonText, allowedIds) {
  // Parse only JSON; reject any leading/trailing prose.
  let obj;
  try {
    obj = JSON.parse(jsonText);
  } catch (e) {
    return { ok: false, reason: "invalid_json" };
  }
  if (typeof obj !== "object" || obj === null) return { ok: false, reason: "not_object" };

  const { choice_id, confidence } = obj;
  if (typeof choice_id !== "string") return { ok: false, reason: "missing_choice_id" };
  if (!allowedIds.includes(choice_id)) return { ok: false, reason: "unknown_choice_id", choice_id };

  const conf = Number(confidence);
  const hasConfidence = !Number.isNaN(conf) && conf >= 0 && conf <= 1;
  return { ok: true, choice_id, confidence: hasConfidence ? conf : null, obj };
}
```
- In `batch.run.js`, construct `allowedIds = choices.map(c => c.id)`.
- After the model call, run `validateChoice`. If not ok → set `choice_id = "unclassified"` and `confidence = 0.51` (floor), log a warning.

### 5) ID → Label mapping and write-out
- Map `choice_id` to `canonical label` using the loaded choices (`id → label`).
- Write the **canonical label** into CSV/JSON output.
- Save the **raw `choice_id`** as a sibling column/field for auditing (e.g., `label_id`).
- Remove truncation/word-cap logic from sanitizer. Sanitizer now only does **Unicode dash normalization** for any **external** inputs you still touch (should be rare).

### 6) Minimal sanitizer
`lib/labelSanitizer.js` now only:
```js
export function normalizeDashes(s = "") {
  return s
    .replaceAll("‚Äî", "—")
    .replaceAll("â€”", "—")
    .replaceAll("â€“", "–")
    .replaceAll("â€•", "—");
}
```
- No truncation. No word caps. Not used for model output anymore.
- Keep it as belt-and-suspenders for any label strings that might still be displayed from legacy paths.

### 7) Unit tests
Add `tests/choiceContract.spec.js`:
- **Valid JSON only:** leading/trailing prose should fail parsing.
- **Enum enforcement:** unknown `choice_id` → reject → `unclassified` in runner.
- **Confidence handling:** numeric 0–1 accepted; missing/NaN tolerated (runner still writes label; keep `confidence` null or floor).
- **Migration safety:** For a sample of channels, simulate model returning:
  - `{"choice_id":"technology","confidence":0.91}` → map to `Technology`.
  - `{"choice_id":"news","confidence":0.88}` → `News`.
  - `{"choice_id":"unclassified","confidence":0.60}` → Unclassified path.
  - `"Technology — software..."` (string) → fails JSON → becomes `unclassified` + warn.

Add `tests/sanitizerMinimal.spec.js`:
- Ensure dash sequences normalize (`‚Äî`,`â€”`,`â€“`,`â€•`).

### 8) NPM scripts
If no test framework exists, add a tiny Node test runner:
- `npm test` runs all `tests/*.spec.js` (each should `throw` on failure).

### 9) Logging & Telemetry
- Log **only** the `choice_id` and the mapped label.
- Count and report any `invalid_json` or `unknown_choice_id` per run (target: **0**).
- Remove the `"auto-coerced invalid label output"` path from logs; it should not occur under the ID contract.

---

## Validation (Expected)
1) **Unit tests pass** (`npm test`).
2) On a **10–20 channel sample** dry-run:
   - No occurrences of `"auto-coerced invalid label output"` in `run.log`.
   - All result rows contain a canonical label and a valid `label_id`.
   - `Unclassified` rows appear only when confidence floor triggered or content truly ambiguous.
3) On full run:
   - `invalid_json` and `unknown_choice_id` counters = **0**.
   - Prior mojibake/separator noise in labels = **0** (sanitizer now irrelevant for model output).

---

## Acceptance Criteria
- Output artifacts (CSV/JSON) contain:
  - `label_id` from enum,
  - canonical `label` derived from `label_id`,
  - confidence number (0–1 or null if absent).
- No verbose/malformed labels; no mojibake or separators in stored labels.
- Logs show **zero** “auto-coerced invalid label output” events.
- All tests pass.

---

## Deliverables
- Updated `labelbook.json` (with ids; names unchanged)
- New `lib/choices.js`, `lib/validateChoice.js`
- Updated `batch.run.js` (ID contract end-to-end)
- Simplified `lib/labelSanitizer.js`
- New tests: `tests/choiceContract.spec.js`, `tests/sanitizerMinimal.spec.js`
- Short changelog entry appended to `CHANGELOG.md`

---

## Commit
`feat(ao): ID-based shortlist contract; strict enum validation; minimal sanitizer; tests (Microstep 5.2c)`
