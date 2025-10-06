# YT‑Digest — Developer SOP & Workflow Primer
_Last updated: 2025‑10‑05_

## 1. Prompting & Microstep SOP

### General Rule
All Cline/Supernova prompts must:
- Begin with the phrase: **"You are continuing development on the YT‑Digest project..."**
- Specify the current **microstep number and title** (e.g., *Microstep 3.2d — Final Label Refinement*).
- Include: **“avoid loading large /data/*.json files into memory”** to prevent context bloat.
- Provide only a brief summary of context; do **not** paste previous full task chains.

### Prompt Flow
1. Define the task scope clearly (1–2 sentences).  
2. Include files to be modified (server/autoOrganize/*.js, etc.).  
3. Define expected validation criteria and debug artifacts.  
4. End with **“Expected Validation”** section (explicit measurable results).  
5. Cline performs run → User validates → Report returned → Proceed to next microstep.

### Microstep Etiquette
- Each microstep must be atomic (safe to commit independently).
- The system state should be functional after every step.
- No cumulative multi‑file rewrites unless explicitly scoped as a “phase”.

### Debug/Validation Policy
- Always confirm expected console/debug/endpoint behavior before proceeding.
- Review `/data/autoOrganize.debug.json` after every microstep.
- If results look wrong → pause → analyze before next task.

---

## 2. Git & Branch Workflow

### Branching Policy
- **main** = stable, working baseline.
- **feature/auto‑organize** = active dev branch for AO clustering work.

### Typical Session Flow
1. Commit small doc/UI changes to `main` (low risk).  
2. Before major logic or clustering work → `git checkout -b feature/auto-organize`.  
3. Perform iterative microsteps and validations.  
4. Once validated → merge back to main:

```bash
git checkout main
git merge feature/auto-organize
git push
```

### Safety Snapshot
Before pivots or experimental steps:

```bash
git tag -a snapshot‑YYYYMMDD‑AO -m "Pre‑pivot stable snapshot"
git push origin snapshot‑YYYYMMDD‑AO
```

This preserves a full restore point.

### Recovery
If a test breaks beyond repair:
```bash
git restore .
```
or, for selective rollback:
```bash
git stash
git stash pop  # later if needed
```

---

## 3. Cline/Supernova Prompt Conventions

### Required Elements
- Start: `"You are continuing development on the YT‑Digest project..."`
- Reference the current AO microstep name/number.
- Include the “no big data loads” disclaimer.
- Avoid emoji (they degrade parsing quality).
- Keep instructions factual, not conversational.

### Optional Elements
- “create steps plan” directive **removed** (Supernova handles its own sequencing better).
- For long operations or multistage builds, use incremental phrasing:  
  _“After validating Step A, proceed with Step B only if debug metrics meet the threshold.”_

---

## 4. AO Development State (as of v3 Pivot)

### Branch
`feature/auto-organize`

### Files of Interest
- `server/autoOrganize/builder.js` → clustering pipeline, dedup, label creation.
- `server/autoOrganize/heuristics3.js` → coarse parent classification.
- `server/autoOrganize/heuristics2.js` → archived fine-grained regex/weighting model (v2).
- `server/autoOrganize/hash.js` → stable ID generator.
- `/data/autoOrganize.*` → runtime/debug artifacts.

### Current State
- Active version: **v3 (Parent/Subcluster Pivot)**.
- Cluster labels: Canonicalized, semantic dedup logic pending full tuning.
- Unclassified ~17% (503‑channel dataset baseline).
- Next major step: refine semantic dedup & finalize unclassified cluster pass.

---

## 5. Merge Strategy & Documentation Discipline

### When to Merge
- Merge only after two consecutive successful microsteps with validated results.
- Update `CHANGELOG.md` with bullet points for each microstep.

### Documenting Transitions
Whenever moving between long conversations:
1. Export current primer/debug/meta data (`autoOrganize.debug.json`, `.meta.json`).
2. Drop a new `YT‑Digest_DEV_vN.md` primer summarizing state, known issues, next planned step.
3. Start the new chat with the uploaded primer for instant continuity.

---

## 6. Key Principles

- **Microstep safety**: Never break main pipeline.
- **Reproducibility**: Each microstep should be runnable independently.
- **Continuity**: Always end a day’s work by producing a `DEV_vN.md` primer.
- **Analysis-first mindset**: Never fix what you haven’t diagnosed.

---
