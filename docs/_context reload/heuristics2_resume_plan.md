# YT-DIGEST — HEURISTICS2 CONTINUATION & IMPROVEMENT PLAN

## 1. Context & Problem Statement
Experiments with pure TF-IDF, cosine clustering, and AI-driven classification demonstrated:
- High token cost and variability—results changed per run, making them unreliable.
- Heuristics2, though handcrafted, provided consistent and explainable categorization with strong cohesion.
- Limitation: It’s tuned to a personal corpus, not portable or adaptive.

Phase 4 aims to evolve Heuristics2 into a **portable, semi-self-learning classifier** that retains rule transparency while broadening coverage.

---

## 2. Strategic Goals

| Area | Goal | Description |
|------|------|-------------|
| **Portability** | ✅ Make ruleset adaptable | Convert fixed rules into parameterized patterns (regex, keyword groups) that can scale to other datasets. |
| **Self-Learning** | ✅ Introduce feedback loop | Allow system to refine or reprioritize rules based on new data (“adaptive heuristics”). |
| **Clarity in UX** | ✅ Distinguish Smart vs. User categories | Clearly label AI/Smart clusters separately from user-created categories. |
| **Data Simulation** | ✅ Create synthetic datasets | Build small app using YouTube API + “find similar” to generate alternate `channels.json` sets for portability testing. |

---

## 3. Core Tasks (Microsteps)

### **Phase 4.1 — Refactor Heuristics Core**
- Extract all rules from `heuristics2.js` into `rules.json` or `ruleset.yaml`.
- Each rule: `pattern`, `keywords`, `weight`, `category`, optional `subCategory`.
- Add runtime logic to score multiple candidate categories (weighted match resolution).

### **Phase 4.2 — Introduce Adaptive Layer**
- Track unmatched term frequencies (from Unclassified pool).
- Suggest new candidate rules dynamically (`potentialRules.json`).
- Implement lightweight “learning pass”:
  - Log user reassignments;
  - Next build integrates learned mappings or weighting hints.

### **Phase 4.3 — Clarify UX / Data Schema**
- Extend `classification.origin`: `"user"`, `"smart"`, `"hybrid"`.
- UI labels:
  - “Smart Cluster” / “Smart Sub-Cluster”
  - “User Category” / “User Sub-Category”

### **Phase 4.4 — Synthetic Dataset Generator**
- Build `yt-synth.py`:
  - Input: seed channels or playlists.
  - Use YouTube API to pull related/similar channels.
  - Output: `channels_*.json` datasets.
  - Supports `--mix` to create composite corpora.
- Purpose: test heuristics portability.

### **Phase 4.5 — Validation & Metrics**
- Metrics: coverage, cohesion, separation, balance.
- Add **rule coverage metric** (% of channels explained by top N rules).
- Maintain `Unclassified ≤ 15%`.
- Track rule evolution via commits.

---

## 4. Architecture & Files

| File | Purpose |
|------|----------|
| `/server/autoOrganize/heuristics2.js` | Core engine (to refactor → modular functions) |
| `/server/autoOrganize/rules.json` | Centralized heuristic patterns |
| `/server/autoOrganize/learn.js` | Adaptive “self-learning” rule suggestion layer |
| `/data/channels_synth/` | Synthetic datasets for testing |
| `/docs/heuristics2_resume_plan.md` | This plan (artifact) |
| `/docs/phase4_primer.md` | Next phase launch doc |

---

## 5. Versioning & Branch Strategy
1. Tag baseline — `v2.0-heuristics2-baseline`
2. Create branch — `feature/heuristics2-phase4`
3. Micro-commits per sub-phase (4.1 → 4.5)
4. Keep regression logs under `/reports/phase4/`.

---

## 6. Deliverables
- Updated modular `heuristics2.js`
- `rules.json` and `potentialRules.json`
- `learn.js` adaptive suggester
- 3+ synthetic datasets (`tech`, `music`, `mixed`)
- Validation report CSV + `report.html`
- `phase4_primer.md`

---

## 7. Timeline (Indicative)
| Phase | Duration | Output |
|--------|-----------|--------|
| 4.1 – Refactor Core | 1 day | Modular `heuristics2` + `rules.json` |
| 4.2 – Adaptive Layer | 1 day | `learn.js` prototype |
| 4.3 – UX Clarity | 0.5 day | Schema & labels |
| 4.4 – Synthetic Datasets | 1 day | Generator + corpora |
| 4.5 – Validation | 0.5 day | Reports + metrics |
_Total: ~4 active days_

---

## 8. Next Document
After approval, generate `phase4_primer.md`:
- Summarize this plan,
- Restate current project status,
- Define kickoff actions for dev.

---

## 9. UI + Data Integration Strategy

### 1. Principles

| Theme | Principle | Reason |
|--------|------------|--------|
| **Transparency** | Always show where a channel “lives.” | Prevent confusion about hidden assignments or duplicates. |
| **Single Source of Truth** | One `categoryOrigin` (`smart`, `user`, `hybrid`) per channel. | Simplifies reassignment and reporting. |
| **No Sub-User Categories** | User categories exist only one level deep. | Keeps the digest “Netflix rails” simple. |
| **Non-destructive Editing** | Moving/merging re-labels; nothing is deleted. | Enables undo and history. |

---

### 2. Core GUI Functions

| Operation | GUI Element | Data Action | Notes |
|------------|-------------|-------------|-------|
| **Move single channel → User Category** | Context “Move to …” | Update `categoryOrigin="user"`, `categoryId` → userCategoryId. | Item marked, not hidden. |
| **Move entire Smart Sub-Cluster → User Category** | “⋯ More > Move entire cluster to…” | Bulk-update children; flag `mergedIntoUserCategory`. | Retain metrics. |
| **Reassign channel → another Smart Cluster** | “Move to another cluster…” | Update `clusterId`; recalc counts. | Fine-tuning clusters. |
| **Merge Smart Sub-Clusters** | “Merge with → Cluster X” | Combine lists, recompute centroid. | Log centroid updates. |
| **Undo / Restore to Smart** | “Return to Smart Cluster” | Reset `categoryOrigin="smart"`. | Enables reversible workflow. |

---

### 3. Visibility Rules

| Scenario | Show / Hide Behavior |
|-----------|---------------------|
| Unassigned → visible in Smart Clusters |
| Assigned → shown with “→ User Category X” badge |
| Toggle: `Show All | Hide Assigned | Only Assigned` |
| “Unclassified” always visible |

---

### 4. Data Model

```js
Channel {
  id: string,
  title: string,
  description: string,
  videoCount: number,
  categoryOrigin: "smart" | "user" | "hybrid",
  categoryId: string,
  prevCategoryId?: string,
  clusterId?: string,
  userCategoryId?: string,
  assignedAt?: ISODate,
  reassigned?: boolean
}

Cluster {
  id: string,
  parentUmbrella: string,
  label: string,
  items: Channel[],
  mergedIntoUserCategory?: string,
  centroid?: object,
  lastModified?: ISODate
}

UserCategory {
  id: string,
  name: string,
  color?: string,
  order?: number
}
```

---

### 5. UI Flow
1. User starts in Auto-Organize (Smart Clusters).
2. Each Smart Cluster panel shows:
   - sub-cluster title  
   - count / coverage bar  
   - badge for moved channels  
   - “Move to…” button.
3. After assignment, item stays visible but marked.
4. Digest (Netflix rails) uses only `UserCategory` data.

---

### 6. Order of Operations

| Step | Area | Objective | Deliverable |
|------|------|------------|-------------|
| 1 | Data Layer | Add fields | Updated schema |
| 2 | API | Add assign/merge/undo endpoints | `PUT /channel/:id/assign` |
| 3 | Frontend | Context menu & bulk actions | UI handlers |
| 4 | Frontend | Visibility filters | Toolbar toggles |
| 5 | Validation | Confirm state sync | Console & visual test |

---

### 7. Why No Sub-User Categories
- Digest rails already serve as top-level visual groupings.  
- Sub-categories complicate navigation.  
- Use **tags or color codes** within each category for nuance.

---

### 8. Future Considerations (Phase 5+)
- AI-suggested User Categories.  
- Assignment history view.  
- Exportable mapping logs.

---

**End of Plan.**
