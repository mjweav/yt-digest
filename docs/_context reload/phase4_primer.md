# YT-DIGEST — PHASE 4 PRIMER

## 1. Project Status Summary
**Project:** YT-Digest  
**Phase:** 4 (Heuristics2 Continuation & Improvement)  
**Baseline Commit:** `67ead4a1b587ef9e18032f50350c44ddd9ff54f8`  
**Core Engine:** `heuristics2.js`  
**App State:** Verified stable baseline build on `main` (503 channels, 26 clusters).  
**Auto-Organize:** Functional using Heuristics2 rule-based engine; TF-IDF fallback enabled for unclassified reassignment.

---

## 2. Current Context
After extended experimentation with TF-IDF, cosine similarity, and AI-driven clustering, the team confirmed:
- Heuristics2 provides **superior explainability and deterministic results.**
- TF-IDF will remain a **secondary helper**, not the core classifier.
- The next objective is to **make Heuristics2 portable, adaptive, and user-transparent.**

All recent planning work has defined a full roadmap for **Phase 4**, summarized below.

---

## 3. Phase 4 Goals
| Goal | Description |
|------|-------------|
| **Portability** | Externalize heuristic rules into `rules.json` for use with any dataset. |
| **Adaptive Learning** | Create `learn.js` to track unclassified items and user reassignments. |
| **GUI Reassignment Flow** | Add “Move to…” for channels/clusters; maintain full visibility. |
| **Data Transparency** | Introduce `categoryOrigin` (“smart”, “user”, “hybrid”) field. |
| **Synthetic Data Testing** | Build `yt-synth.py` to generate alternate `channels.json` datasets. |

---

## 4. Key UX & Data Model Decisions
- **No sub-user categories.** User Categories remain single-level rails (like Netflix rows).  
- **All assignments remain visible**; toggles control “Show/Hide Assigned.”  
- **Merge & Undo operations** available for clusters.  
- **Digest UI** continues to draw exclusively from User Categories.

New schema fields include:
```js
categoryOrigin: "smart" | "user" | "hybrid"
categoryId, prevCategoryId, userCategoryId
assignedAt, reassigned
```

---

## 5. Upcoming Microsteps

| Microstep | Focus | Outcome |
|------------|--------|----------|
| **4.1** | Refactor heuristics2 core | Modularize functions and extract `rules.json`. |
| **4.2** | Adaptive layer | Build `learn.js` for feedback-driven rule generation. |
| **4.3** | Schema/UX sync | Add reassignment & visibility logic to UI. |
| **4.4** | Synthetic datasets | Implement `yt-synth.py` for regression testing. |
| **4.5** | Validation | Cohesion, coverage, and rule coverage reports. |

---

## 6. Supporting Documents
| File | Purpose |
|------|----------|
| `/docs/heuristics2_resume_plan.md` | Full technical plan |
| `/docs/context_phase4.json` | Compact state capsule (for model reloads) |
| `/docs/phase4_primer.md` | This summary primer |
| `/server/autoOrganize/heuristics2.js` | Core refactor target |
| `/server/autoOrganize/rules.json` | Rule definitions |
| `/server/autoOrganize/learn.js` | Adaptive module |

---

## 7. How to Resume in Future Chats
When starting a new ChatGPT session:
1. Upload:
   - `phase4_primer.md`
   - `context_phase4.json`
2. Then say:
   > "Resume YT-Digest Phase 4 from Microstep 4.1 — Refactor heuristics2.js into modular form using rules.json and learn.js."

This restores full project continuity without reloading large chat archives.

---

**End of Primer.**
