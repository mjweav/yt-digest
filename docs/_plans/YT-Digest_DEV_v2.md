# YT-Digest DEV v2 — Heuristics2 Era (Granular Approach)

**Date:** 2025-10-05
**Context:** This document captures the development architecture and rationale from the *Heuristics2.js* era of YT-Digest — before the v3 parent/subcluster pivot and semantic deduplication initiatives.

---

## 1. Core Concept
The v2 system focused on **granular heuristic patterning** for per-channel classification using regular expressions and rule-based scoring.

- Channels were processed through `heuristics2.js` using **weighted regex scoring**.
- Scores were aggregated across title, description, and URL fields with distinct field weights:
  - Title: 3.0
  - Description: 1.6
  - URL: 0.6

---

## 2. Heuristics2 Scoring Engine
### Features:
- Multi-field analysis with configurable weights.
- Positive and negative term lists to avoid false matches.
- Tie-breaking logic based on score margin (default margin: 0.75).
- Baseline threshold and “Unclassified” fallback for weak scores.
- Debug mode returning full scoring details per channel.

### Key Parameters:
| Parameter | Purpose | Default |
|------------|----------|----------|
| BASELINE | Minimum score to qualify as classified | 0 |
| MIN_MARGIN | Required gap between best & second-best | 0.75 |
| FIELD_WEIGHTS | {"title": 3.0, "desc": 1.6, "url": 0.6} | Customizable |
| NEGATIVE_TERMS | Prevent overfitting categories | Defined per category |

---

## 3. TF-IDF Fallback Layer (v2.1)
Integrated a lightweight TF-IDF scoring fallback for low-confidence classifications.  
This enabled “like-with-like” analysis across unlabeled channels, reclassifying ~15–20% of previously unclassified cases.

### Characteristics:
- Memory-only implementation (no DB writes).
- Fallback applied after heuristic scoring.
- Reuses category centroid vectors for clustering similarity.
- Used cosine similarity threshold ≥ 0.22 for consensus classification.

---

## 4. Data Sources
- **channels.json:** Primary dataset of 503 YouTube channels.
- **channelCategories.json:** User-managed category persistence.
- **autoOrganize.debug.json:** Detailed per-channel debug and scoring data.

### Debug output fields included:
```json
{
  "id": "UCaWd5_7JhbQBe4dknZhsHJg",
  "title": "WatchMojo.com",
  "finalLabel": "Entertainment & Media",
  "method": "heuristic",
  "scores": { "Music": 0.25, "News": 0.18, ... },
  "why": {
    "pattern": "music|band|song",
    "field": "desc",
    "match": "rock music top 10"
  }
}
```

---

## 5. Debug + Diagnostics Enhancements
- Added `/api/auto-organize?debug=1` to expose scoring metrics.
- Added `/debug/export` to persist a snapshot of debug state (`autoOrganize.debug.json`).
- Recorded per-category hit counts and method mix (heuristic vs tfidf vs override).

---

## 6. Limitations
- Rule bloat: growing regex complexity created diminishing returns.
- Overfitting to user dataset (503-channel bias).
- Rigid text-based logic underperformed for nuanced topics.
- Zero-length or URL-only descriptions remained problematic.
- Manual tuning required frequent iterations to rebalance.

---

## 7. Transition Point (→ v3)
The v2 system laid strong foundations for explainability and performance, but lacked generalization.  
Transition to v3 focused on:
- Introducing **parent/subcluster hierarchy** for scalable structure.
- Improving cluster name consistency and semantics.
- Reducing rule dependency in favor of hybrid heuristic + TF-IDF clustering.
- Preparing groundwork for optional AI labeling assist.

---

## 8. Legacy Artifacts
Files from this phase (preserved in repo):
- `server/autoOrganize/heuristics2.js`
- `server/autoOrganize/builder.js` (pre-pivot version)
- `server/routes/autoOrganize.js`
- `data/autoOrganize.debug.json` (v2)
- `data/autoOrganize.json` (v2)

---

## 9. Summary
The **Heuristics2.js era** was a rule-heavy but interpretable approach that advanced classification precision substantially before pivoting toward scalable semantic clustering in v3.  
It remains valuable as a fallback or audit layer for explainability, regression testing, or hybrid model experimentation.

---

**Status:** Stable — preserved as `YT-Digest DEV v2 (Heuristics2)` snapshot for historical reference and potential rollbacks.
