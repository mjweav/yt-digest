# Auto-Organize Invariants

Baseline metrics captured on 2025-10-06 for Phase 4 refactor validation.

## Current Baseline Metrics

**Totals:**
- **Channels:** 503
- **Clusters:** 8
- **Unclassified Count:** 334

**Per-Cluster Distribution:**
- **Unclassified:** 334 channels (66.4% of total)
- **Photography & Cameras:** 20 channels (4.0% of total)
- **Business & Marketing:** 32 channels (6.4% of total)
- **AI & Emerging Tech:** 21 channels (4.2% of total)
- **General Tech & Reviews:** 27 channels (5.4% of total)
- **Health & Medicine:** 16 channels (3.2% of total)
- **Video Editing & Creative Tools:** 17 channels (3.4% of total)
- **Music & Musicians:** 36 channels (7.2% of total)

**Classification Methods:**
- **Scored (heuristic/TFIDF):** 503 channels (100%)
- **Override:** 0 channels (0%)

## Invariants to Guard in Phase 4.1

### Total Metrics (Must Remain Equal)
- Total clusters == 8
- Total channels == 503

### Per-Cluster Channel Counts (Must Not Increase)
- Unclassified channels <= 334 (ideally should decrease)
- Photography & Cameras == 20
- Business & Marketing == 32
- AI & Emerging Tech == 21
- General Tech & Reviews == 27
- Health & Medicine == 16
- Video Editing & Creative Tools == 17
- Music & Musicians == 36

### Classification Method Distribution
- All current classifications use "scored" method (heuristic/TFIDF)
- No override classifications currently exist

## Validation Commands

```bash
# Generate fresh metrics for comparison
node scripts/exportAO.js

# Compare with baseline
diff data/autoOrganize.metrics.json data/autoOrganize.baseline.json

# Test UI output consistency
curl "http://localhost:3000/api/auto-organize?debug=1" > /tmp/ao-output-new.json
curl "http://localhost:3000/api/auto-organize?debug=1" > /tmp/ao-output-baseline.json
diff /tmp/ao-output-new.json /tmp/ao-output-baseline.json
```

## Notes

- Baseline captured before any Phase 4 refactoring begins
- All channels currently classified via scoring heuristics (no manual overrides)
- Unclassified represents the largest category (66.4%) - primary optimization target
- Per-cluster channel counts should never increase during refactoring
- Total cluster count should remain stable (new clusters may be added but existing ones should not be removed)
