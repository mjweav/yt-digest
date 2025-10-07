You are continuing work on the YT-Digest project.
Standalone Patch — 2025-10-06_lwl-fixes-v1

Essentials SOP
0) Do NOT load large `/data/*.json` into context; no need for that here.
1) Work ONLY on:
   - `scripts/label_terms.js`
   - `scripts/lwl_cluster.js`
2) Make the exact edits below; avoid refactors.
3) On completion: **update changelog.md accordingly** (concise entry with date + patch name).

Context
- Running `node scripts/lwl_cluster.js` throws a SyntaxError at the CSV header line, and `label_terms.js` has a bad regex.
- We need to fix string literals (newline escapes) and the regex character class to make the harness runnable.

Objective
- Fix syntax errors so the LWL harness runs cleanly and emits the 3 output files.

Changes (surgical)

File: scripts/label_terms.js
- Locate the `normalize` function.
- Replace the malformed `.replace` line with this exact line (note the leading and trailing `/` around the character class):
```js
.replace(/[^\p{L}\p{N}\s\-&]/gu, " ")
```

File: scripts/lwl_cluster.js
1) **CSV header string (channels CSV):**
- Find the block that writes `lwl_channels.csv`.
- Ensure the header is a single quoted string with an explicit newline escape:
```js
const header = "channelId,channelName,lwlLabel,topTerms\n";
```
- Ensure each `lines.push(...)` ends with `\n` inside the string literal, e.g.:
```js
lines.push(`${id},"${name}",${label?`"${label.replace(/"/g,'""')}"`:""},${top?`"${top.replace(/"/g,'""')}"`:""}\n`);
```

2) **CSV header string (summary CSV):**
- Find the block that writes `lwl_summary.csv`.
- Ensure header is:
```js
const header = "label,count,percent,cohesion\n";
```
- Ensure each pushed line ends with `\n`, e.g.:
```js
lines.push(`"${c.label}",${c.size},${pct},${c.cohesion}\n`);
```

Validation (run exactly)
1) `node scripts/lwl_cluster.js`
   - Expect console:  
     `Wrote:` paths for  
     `data/lwl_clusters.json`, `data/lwl_channels.csv`, `data/lwl_summary.csv`
2) Inspect file sizes (non-zero):  
   - `ls -lh data/lwl_*`
3) (Optional quick peek)
   - `head -n 5 data/lwl_summary.csv`
   - `head -n 5 data/lwl_channels.csv`

Acceptance gates
- `node scripts/lwl_cluster.js` runs with **no** exceptions.
- All three output files are present and non-empty.

Commit
chore(lwl): fix regex and CSV literals; make harness runnable; update changelog.md accordingly
