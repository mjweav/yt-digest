# YT-Digest Development Primer — v3
_Date: 2025-10-05_

## Project Overview
YT-Digest is a local-first, AI-assisted YouTube channel categorization and digest tool.  
It automatically classifies user-subscribed channels into thematic clusters using heuristics, TF-IDF similarity, and optional AI labeling.

### Current System
- **Backend:** Node.js (Express), `server/autoOrganize/`
- **Frontend:** React (local GUI with clusters visualization)
- **Data:** `/data/channels.json`, `/data/autoOrganize.json`, `/data/autoOrganize.debug.json`
- **Core Logic:** Hybrid Heuristic + TF-IDF classification pipeline

## Recent Work (through Microstep 3.2c)
We implemented a robust multi-stage clustering system with parent/subcluster organization and improved labeling.

### Highlights
- Two-tier hierarchy: **Parent categories** (10 major types) + **Subclusters**
- Stable `clusterId` generation via hash (FNV-1a)
- Cached cluster metadata (`autoOrganize.meta.json`)
- Canonicalized label system (Parent • Term1 • Term2)
- Deduplication attempts (cosine + Jaccard)
- TF-IDF fallback for low-confidence channels
- Current accuracy: ~82% classified, 17–18% unclassified

### Known Issues
- **Unclassified remains high (~88–100 channels)**
- **Duplicate or semantically overlapping labels**
- Some misclassifications (Music/News/Business)
- TF-IDF fallback executes late (post-heuristic), limiting recovery

## Next Planned Step — Microstep 3.3
### “TF-IDF Parent Reassignment Pass”
Add a lightweight pass **before subclustering** that attempts to reassign Unclassified channels based on their TF-IDF similarity to **parent category centroids**.

#### Implementation Summary
- Build TF-IDF vectors for all channels (title+desc)
- Compute per-parent centroid vectors (for parents with ≥5 channels)
- For each Unclassified channel (with descLen ≥20):
  - Compute cosine similarity to all parent centroids
  - If bestSim ≥ 0.25 → assign that parent, mark method=`tfidfParent`
- Continue to subclustering as usual
- Add debug output for reassignment counts and parameters

#### Validation Targets
- Reduce unclassified from ~18% → under 10%
- Maintain total count consistency (503)
- Add debug fields: `tfidfParentAssigned`, `byMethod`, `unclassified` post-pass

#### Files Affected
- `server/autoOrganize/builder.js`
- `server/routes/autoOrganize.js`
- `data/autoOrganize.meta.json` (log reassignment params)

## Future Direction (Post-3.3)
1. **AI Label Assist (Optional)**  
   - Use GPT-5 or similar to label remaining “Unclassified” based on `title + desc` text
   - Map back to existing parent/subcategory set
   - Avoid per-channel API calls — batch 25–50 rows per request

2. **UI & Workflow**
   - Improve cluster labeling visuals
   - Add “Add Cluster to Category” workflow for users
   - Cache AO results for faster load

3. **Performance & Caching**
   - Persist cluster cache (`autoOrganize.json`) and meta for reloads
   - Optional lazy updates instead of full recompute

## Quick Commands
### Refresh Debug Output
```bash
curl -s -X POST http://localhost:3001/api/auto-organize/debug/export | jq '.summary'
```

### Validate Classification
- Check `total=503`
- Look for `"tfidfParent"` in `byMethod`
- Expect `unclassified` < 100

---
_This primer captures the current project state, challenges, and roadmap as of Microstep 3.2c, and should be loaded at the start of the next conversation to maintain context._
