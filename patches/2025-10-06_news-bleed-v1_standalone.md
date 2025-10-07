You are continuing work on the YT-Digest project.
Standalone Patch — 2025-10-06_news-bleed-v1

Essentials SOP
0) Do NOT load large `/data/*.json` into context; when inspection is needed, use `jq`/`rg` with tiny excerpts only.
1) Work on these paths only (no other files):
   - `server/autoOrganize/rules.json`
   - `server/autoOrganize/taxonomy.json` (read-only unless specified)
   - `scripts/exportAO.js` (read-only; used by validation run)
   - `scripts/export_csv.js` (read-only; used by validation run)
   - `scripts/export_lowmargin.js` (read-only; used by validation run)
2) On completion: **update changelog.md accordingly** (concise entry with date + patch name).
3) Keep edits surgical; avoid refactors; no UI changes in this patch.

Context
- We’ve observed “News” bleeding: generic tokens like `report/update/world/global` are pulling non-news channels into the News cluster.
- Examples: B&H Photo Video, Ben Halsall, No Film School, Callum Graham, Doctor Mix, Microsoft, etc.
- Goal: tighten the News rule with excludes and add minimal positive anchors to pull obvious channels to their correct clusters.
- Flat taxonomy stays. Governance (displayCap, minSize, minPurity) remains unchanged.

Objective
- Reduce non-news misclassifications in **News**.
- Add targeted positive anchors (low weight, scoped) across affected clusters to “pull” obvious cases.
- No global threshold/minMargin changes. No builder/exporter logic changes.

Changes (surgical)
File: server/autoOrganize/rules.json
- In the **News** rule block:
  - Soften generic includes (reduce generic term weight):
    - `(?i)\b(world|global)\b` → weight **0.4**
  - Add **excludes** (case-insensitive) to stop bleed:
    - Editing tools: `(?i)\b(premiere|after\s*effects|resolve|final\s*cut|fcp|editor|editing)\b`
    - Photo/gear:  `(?i)\b(camera|lens|photograph(y|er)|bhphoto|b&h)\b`
    - Music:       `(?i)\b(guitar|drum|drummer|band|record|mix|studio)\b`
    - DIY/Maker:   `(?i)\b(sketchup|cad|cnc|router\s*bit|lathe|bandsaw|planer|mortise|dovetail)\b`
    - Comedy:      `(?i)\b(prank|comedy|sketch|jfl)\b`
    - Big brands:  `(?i)\b(red\s*bull|paramount\s*pictures|microsoft)\b`
- Add **positive anchors** (light weights; scoped/capped if your schema supports metadata). Use your existing schema fields for weights.
  - Photography & Cameras
    - Includes: `(?i)\bb&h\b|(?i)\bbhphoto\b|(?i)\bb\s*&\s*h\s*photo\b` → **+1.2**
  - Video Editing & Creative Tools
    - Includes: `(?i)\bripple\s*training\b|(?i)\bno\s*film\s*school\b|(?i)\bhollywood\s*fcp\b|(?i)\bben\s*halsall\b` → **+1.2–1.3**
  - Music & Musicians
    - Includes: `(?i)\bcallum\s*graham\b|(?i)\bdoctor\s*mix\b|(?i)\bvic\s*firth\b` → **+1.2**
  - Business & Marketing
    - Includes: `(?i)\bcreator\s*magic\b|(?i)\bsean\s*dollwet\b|(?i)\bmatthew\s*berman+n?\b` → **+1.2**
  - Gardening
    - Includes: `(?i)\bjoe\s*garden(er)?\s*tv\b` → **+1.3**
  - AI & Emerging Tech
    - Includes: `(?i)\bprompt\s*engineering\b|(?i)\brob\s*the\s*ai\s*genius\b|(?i)\bmachine\s*learning\b` → **+1.0–1.2**
  - DIY verticals
    - Home Repair & Tools: `(?i)\bmagic\s*plan\b|(?i)\bmagicplan\b` → **+1.1**
    - Maker & 3D Printing:  `(?i)\bsketchup\b` → **+1.1**
    - Construction & Trades: `(?i)\bpractical\s*engineering\b` → **+1.1**
  - General Tech & Reviews
    - Includes: `(?i)\bmicrosoft\b` → **+1.0**
- Optional: **ColdFusion** placement
  - If you want it in News (tech explainers): add include `(?i)\bcold\s*fusion\b` → **+1.1**
  - Or move that include to General Tech with the same weight.

Notes on editing rules.json
- Preserve existing schema/fields; add to the appropriate include/exclude/weight lists.
- Keep brand/entity anchors minimal and low-weight (they should “nudge,” not dominate).
- Do not modify global `minMargin` or per-category thresholds in this patch.

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
     jq '.perCluster | map({label, count:(.channelCount//.size), purity})' data/autoOrganize.metrics.json | head -n 40
     ```
   - Low-margin sampler (QC triage):
     ```bash
     node scripts/export_lowmargin.js --overall=60 --perCluster=20
     ```

Acceptance gates
- `channels == 503`
- `clusters ≤ 20` (displayCap)
- `Unclassified ≤ 155` (stay same or improve)
- The following move **out of News** to the expected clusters:
  - B&H Photo Video → Photography & Cameras
  - Ben Halsall, Hollywood FCP, No Film School → Video Editing & Creative Tools
  - Callum Graham, Doctor Mix, Vic Firth → Music & Musicians
  - Creator Magic, Sean Dollwet, Matthew Berman(n) → Business & Marketing
  - Joe Gardener TV → Gardening
  - Prompt Engineering, Rob the AI Genius, Machine Learning → AI & Emerging Tech
  - magicplan → Home Repair & Tools (DIY family)
  - Microsoft → General Tech & Reviews
  - Practical Engineering → Construction & Trades
  - (ColdFusion and Paramount/Red Bull can remain non-News; ColdFusion placement per note above)

Commit
`fix(ao-rules): tighten News excludes; add targeted anchors to correct bleed; keep flat taxonomy; update metrics`

End by: **update changelog.md accordingly** (brief entry tagged “2025-10-06_news-bleed-v1”).
