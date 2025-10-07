You are continuing work on the YT-Digest project.
Standalone Patch — 2025-10-06_diy-cleanup-v1

Essentials SOP
0) Do NOT load large `/data/*.json` into context; when inspection is needed, use `jq`/`rg` with tiny excerpts only.
1) Work on these paths only (no other files):
   - `server/autoOrganize/rules.json`
   - `server/autoOrganize/taxonomy.json` (read-only unless specified for `parent` tags already present)
   - `scripts/exportAO.js` (read-only; used by validation run)
   - `scripts/export_csv.js` (read-only; used by validation run)
   - `scripts/export_lowmargin.js` (read-only; used by validation run)
2) On completion: **update changelog.md accordingly** (concise entry with date + patch name).
3) Keep edits surgical; avoid refactors; no UI changes in this patch (flat taxonomy remains).

Context
- After `news-bleed-v1`, DIY-related items still look messy and absorb unrelated channels.
- We already created DIY vertical microtopics (Woodworking & Fabrication; Home Repair & Tools; Construction & Trades; Maker & 3D Printing) with `parent: "DIY, Home & Construction"`.
- Root causes:
  1) **Ambiguous tokens** (e.g., `router`) colliding with Tech (`Wi‑Fi router`).  
  2) **Weak positive evidence** for real DIY verticals (margins too small).  
  3) **Missing excludes** in adjacent clusters (Tech/AI/News) allow drift into or out of DIY.
- Goal: strengthen portable vertical lexicons (positive anchors) + add precise excludes to disambiguate common collisions.

Objective
- Improve classification purity for DIY family and reduce accidental intake.
- Promote legitimate DIY microtopics (size ≥ 5 and purity ≥ 0.7) without allowlisting.
- Keep flat taxonomy; no subcluster UI changes.

Changes (surgical)
File: server/autoOrganize/rules.json

A) **Woodworking & Fabrication** — add strong portable includes (+1.0~1.2), plus “router” disambiguation
- Includes (add, case-insensitive):
  - `\b(jointer|planer|bandsaw|lathe|dovetail|mortis(e|ing)|tenon|chisel|jig|fence)\b` → **+1.1**
  - `\b(cabinet(?:ry)?|hardwood|softwood|plywood|mdf|kerf|rip\s*cut|cross\s*cut)\b` → **+1.0**
  - `\b(cnc|spoil\s*board|x\-carve|shapeoko)\b` → **+1.0**
  - Disambiguated router signal: `\brouter\s*(bit|table|fence|collet|carbide|shank)\b` → **+1.2**
- Excludes (to keep electronics/IT away):
  - `\b(wi[-\s]?fi|ethernet|mesh|firmware|router\s*login)\b`
- (Optional brand nudges, capped): `essential\s*craftsman|steve\s*ramsey|izzy\s*swan` → **+0.8**

B) **Home Repair & Tools** — tighten general home-fix signals; avoid electronics false positives
- Includes:
  - `\b(drywall|plumbing|hvac|thermostat|outlet|breaker|stud\s*finder|caulk|grout|solder|flux)\b` → **+1.0**
  - `\b(impact\s*driver|oscillating\s*(multi[-\s]?tool)?|reciprocating\s*saw)\b` → **+1.1**
- Excludes:
  - `\b(usb|driver\s*update|gpu\s*driver|display\s*driver)\b`

C) **Construction & Trades** — solid building trade lexicon
- Includes:
  - `\b(framing|joist|rafter|ledger|rebar|masonry|formwork|footing|anchor\s*bolt|sheathing|osb|truss|concrete|pour|curing)\b` → **+1.1**
- Excludes:
  - `\b(software|sdk|api|release\s*notes)\b`

D) **Maker & 3D Printing** — classic 3D-print vocabulary
- Includes:
  - `\b(pla|petg|abs|stl|gcode|slicer|nozzle|extruder|marlin|klipper|prusa|ender)\b` → **+1.1**
- Excludes:
  - `\b(vst|plugin|preset)\b` (avoid music tooling)

E) **Guard rails in adjacent clusters** (prevent stealing DIY traffic)
- **General Tech & Reviews — add excludes:**
  - `\b(jointer|planer|bandsaw|lathe|dovetail|mortis(e|ing)|rebar|joist|rafter|router\s*bit|stud\s*finder|osb|framing)\b`
- **AI & Emerging Tech — add excludes (rare but safe):**
  - `\b(router\s*bit|lathe|bandsaw|planer|dovetail|rebar|joist|rafter|concrete)\b`
- **News — add one more DIY guard (light):**
  - `\b(drywall|framing|joist|rafter|mortise|lathe|bandsaw|planer)\b`

Notes on editing rules.json
- Preserve existing schema/fields; append includes/excludes to the relevant label objects.
- Weights are modest on purpose so rules “nudge” but don’t bulldoze.
- No change to global `minMargin` or category thresholds in this patch.

Validation (run exactly)
1) `node scripts/exportAO.js`
2) `./runmetrics.sh`
3) Probes:
   - Headline:
     ```bash
     jq '{channels:.totals.channels, clusters:.totals.clusters, unclassified:.totals.unclassified}' data/autoOrganize.metrics.json
     ```
   - Purity snapshot (governed):
     ```bash
     jq '.perCluster | map({label, count:(.channelCount//.size), purity})' data/autoOrganize.metrics.json | head -n 60
     ```
   - Low-margin sampler (QC triage):
     ```bash
     node scripts/export_lowmargin.js --overall=80 --perCluster=25
     ```

Acceptance gates
- `channels == 503`
- `clusters ≤ 20` (displayCap)
- `Unclassified ≤ 159` (stay same or improve)
- DIY umbrella **does not grow**; at least one DIY microtopic meets promotion gates: `size ≥ 5` **and** `purity ≥ 0.7` (or clearly trending upward if just below).
- Purity for DIY microtopics increases vs. previous run; low‑margin list shows fewer DIY misroutes.

Commit
`fix(ao-rules): strengthen DIY vertical lexicons; add cross-cluster guards; improve purity and reduce drift (flat taxonomy)`

End by: **update changelog.md accordingly** (brief entry tagged “2025-10-06_diy-cleanup-v1”).
