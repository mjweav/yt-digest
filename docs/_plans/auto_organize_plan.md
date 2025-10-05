# yt-digest — Auto Organize (AO) Roadmap & Working Notes
_Last updated: 2025-10-03 04:22:35_

## 0) One-liner
**Strategy:** _Like with Like → then Label → then Assign._  
Cluster channels by natural similarity first, then apply human-readable labels, and finally let users assign to their own categories for digests.

---

## 1) Current Status (what’s working)
- **Auto Organize view** (dense bubble collage) shipped as a spike; sticky header; multi-select; drop-up category assign.
- **Images**: client-only lazy load + concurrency cap + retry sweep (no proxy); eager first N per cluster.
- **Categories**: real persistence via `data/categories.json` + `data/channelCategories.json`; bulk assign; UI hydrates assigned state on first paint.
- **Heuristics v2**: weighted scoring (title/desc/url), positives/negatives, tie margin; manual overrides.
- **Debugging**: `GET /api/auto-organize?debug=1` writes `data/autoOrganize.debug.json`; `/debug/export` endpoint.
- **Data paths**: robust resolver finds repo `data/`; env overrides supported (`DATA_DIR`, `REPO_ROOT`).

---

## 2) What’s not yet right
- **Grouping quality**: too many `Unclassified`; some mislabels (Business too greedy; missing Weather/Aviation/Gardening/News coverage).
- **Layout**: vertical whitespace from naive span packing; needs montage row-packer.
- **Hover details**: delayed (debounced) info popover not implemented.
- **Cluster naming**: currently label-per-item; we want cluster-first then label (per the strategy).

---

## 3) The North Star
**“Like with Like → then Label.”**
1. **Cluster** (unsupervised, no tokens): TF‑IDF vectors over `title + desc`; HDBSCAN (auto K) or k‑means; cache to `/data/autoOrganize.clusters.json`.
2. **Label** clusters: rule-based labeler from top terms & representative titles; (optional) AI labeler behind a flag later.
3. **Assign**: keep user categories separate; show assigned badges; enable bulk assign within clusters.
4. **Persist**: cache clusters; allow `overrides.json` to pin a channel’s cluster; Recompute button.

---

## 4) Agreed Near‑Term Plan (Microsteps backlog)
**2.1 — Improve grouping quality (no AI)**
- Add categories: **Weather & Storms**, **Aviation & Flight**, **Gardening & Outdoors**, **News & Commentary** with precise pos/neg nets.
- Tighten **Business & Marketing** (add negatives) and strengthen **Photo/Video Editing/Music** positives.
- Lower tie margin from **0.75 → 0.5**.
- Ensure **description** is passed and scored for all channels.
- (Optional) **TF‑IDF nearest-category fallback** when heuristic scores are **all zero** (seed exemplars per category).  
**Success:** Unclassified < 25%; obvious mislabels fixed (Reed Timmer → Weather, 74 Gear → Aviation, CaliKim → Gardening, B&H/Brandon Li/BretFX → Photo/Editing, ColdFusion/Asianometry → Tech/AI).

**1.8 — Montage row‑packer (UI)**
- Keep 12‑unit grid; compute spans (1/2/3/4 → 3/6/9/12).
- Greedy bin‑packing per row to minimize gaps; sort clusters by span desc; try fit combos (9+3, 6+6, 6+3+3, etc.).  
**Success:** significantly less vertical whitespace; organic collage feel maintained.

**1.9b — Hover info (debounced)**
- 600–1200ms debounced hover popover: title, cats, short desc; appears above neighbors; accessible fallback on focus.
- Do not block image loading/concurrency; keep pointer events sane.  
**Success:** memory‑jog UX without flicker or jank.

**2.2 — Cluster‑first pipeline (Like‑with‑Like)**
- Build TF‑IDF → (UMAP optional) → HDBSCAN or k‑means on `title+desc`.
- Compute **cluster tops**: keywords, representative channels, size; persist `/data/autoOrganize.clusters.json`.
- **Label clusters** using rule labeler (short, human‑friendly).  
**Success:** clusters feel coherent; labels read well; users can still bulk assign to personal categories.

**2.3 — Optional AI labeler (flagged)**
- If enabled, pass cluster summary (top terms + top titles) to GPT for a succinct label; cache results.  
**Success:** improved names without runtime cost (cached), opt‑in only.

---

## 5) Validation Checklist (quick commands)
```bash
# Recompute (writes data/autoOrganize.json)
curl -s -X POST http://localhost:3000/api/auto-organize/recompute | jq

# Clusters count (non-debug)
curl -s http://localhost:3000/api/auto-organize | jq '.clusters | length'

# Debug file (ensure non-empty, rows ~503)
curl -s "http://localhost:3000/api/auto-organize?debug=1" | jq '.debug'
node -e "const fs=require('fs'); console.log(fs.statSync('data/autoOrganize.debug.json').size > 1000 ? "OK" : "Too small")"
```

---

## 6) Data & Files (truth locations)
- `data/channels.json` — source channels (~503)
- `data/autoOrganize.json` — cached AO output
- `data/autoOrganize.debug.json` — latest debug
- `data/autoOrganize.overrides.json` — manual label/cluster overrides
- `data/categories.json` & `data/channelCategories.json` — user categories & assignments

---

## 7) Endpoints
| Method | Path                                   | Purpose |
|-------:|----------------------------------------|---------|
| GET    | `/api/auto-organize`                   | Clusters (with per-channel `cats`) |
| GET    | `/api/auto-organize?debug=1`           | As above + writes `data/autoOrganize.debug.json` |
| POST   | `/api/auto-organize/recompute`         | Rebuild clusters; write cache |
| POST   | `/api/auto-organize/debug/export`      | Force debug export file |
| GET    | `/api/categories`                      | List user categories |
| POST   | `/api/categories`                      | Create category |
| POST   | `/api/categories/bulk-assign`          | Assign channels to a category |

---

## 8) Risks / Watch‑outs
- **Greedy rules:** Business & Marketing overreach; keep negatives updated.
- **Sparse descriptions:** Some channels lack desc → use title, and (later) similarity fallback.
- **Perf:** Clustering (HDBSCAN) can be heavier; cache outputs and add a Recompute button.
- **UX density:** Keep large bubbles rare; ensure collage doesn’t occlude popovers.

---

## 9) Decision log (today)
- Keep MVP **no‑token**; add AI labeling behind a feature flag later.
- Fix grouping via **better heuristics + new categories** before UI packing.
- Persist and hydrate **assigned** state on first paint (done).

---

## 10) Next session starting point
- Run **Microstep 2.1** (improve grouping quality as above).  
- Then **1.8** (montage row packer).  
- Optional: add TF‑IDF nearest-category fallback if still >25% Unclassified.
