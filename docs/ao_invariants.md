# Auto-Organize Invariants

Baseline metrics captured on 2025-10-06 for Phase 4 refactor validation.

**Post-refactor baseline established 2025-10-06 after externalizing rules to rules.json**

## Current Baseline Metrics

**Totals:**
- **Channels:** 503
- **Clusters:** 9
- **Unclassified Count:** 320

**Per-Cluster Distribution:**
- **Unclassified:** 320 channels (63.6% of total)
- **Photography & Cameras:** 19 channels (3.8% of total)
- **Business & Marketing:** 27 channels (5.4% of total)
- **AI & Emerging Tech:** 20 channels (4.0% of total)
- **General Tech & Reviews:** 20 channels (4.0% of total)
- **Health & Medicine:** 15 channels (3.0% of total)
- **Video Editing & Creative Tools:** 17 channels (3.4% of total)
- **Music & Musicians:** 35 channels (7.0% of total)
- **DIY, Home & Construction:** 30 channels (6.0% of total)

**Classification Methods:**
- **Scored (heuristic/TFIDF):** 503 channels (100%)
- **Override:** 0 channels (0%)

## Invariants to Guard in Phase 4.2+

### Total Metrics (Must Remain Equal)
- Total clusters == 9
- Total channels == 503

### Per-Cluster Channel Counts (Must Not Increase)
- Unclassified channels <= 320 (ideally should decrease)
- Photography & Cameras == 19
- Business & Marketing == 27
- AI & Emerging Tech == 20
- General Tech & Reviews == 20
- Health & Medicine == 15
- Video Editing & Creative Tools == 17
- Music & Musicians == 35
- DIY, Home & Construction == 30

### Microstep 4.2a Delta Windows (Rules Pack v1)
- **Unclassified:** must decrease by ≥20 and ≤80 in 4.2a.
- **Target clusters** may increase by ≤+40 each in 4.2a:
  - News: new cluster (baseline 0)
  - Gardening: new cluster (baseline 0)
  - Aviation: new cluster (baseline 0)
  - Music & Musicians: may increase by ≤+40 (baseline 35)
  - Business & Marketing: may increase by ≤+40 (baseline 27)
  - Photography & Cameras: may increase by ≤+40 (baseline 19)
  - General Tech & Reviews: may increase by ≤+40 (baseline 20)
  - DIY, Home & Construction: may increase by ≤+40 (baseline 30)
- **Non-target clusters:** no change:
  - Health & Medicine: must remain 15
  - AI & Emerging Tech: must remain 20
  - Video Editing & Creative Tools: must remain 17

### Classification Method Distribution
- All current classifications use "scored" method (heuristic/TFIDF)
- No override classifications currently exist

## Architecture Changes (Phase 4.1)
- **Rules externalized** from heuristics2.js to server/autoOrganize/rules.json
- **Pure functions** maintained in heuristics2.js (scoreChannel, classifyChannel)
- **Stub created** for future telemetry features (server/autoOrganize/learn.js)
- **Async pattern** introduced for rule loading and classification

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
