# 🌐 YT-Digest — Big Picture Context

## 🔭 Mission
YT-Digest is a **personal YouTube knowledge and discovery companion** — a system that helps users *curate, understand, and navigate* their subscriptions far beyond the limits of the native YouTube interface.

It turns a noisy subscription feed into a *digestible, categorized, and explorable knowledge graph* of creators, topics, and ideas.

---

## 🧩 Core Pillars

### 1. Data Acquisition
- **Google OAuth + YouTube Data API v3**  
  - Fetches subscriptions, playlists, and video metadata.  
  - Optimized for quota efficiency (10 000 units/day limit).
- **Caching Layer (data/\*.json)**  
  - Maintains local persistence between sessions.  
  - Avoids redundant API calls.

### 2. Auto-Organize & Classification
- Converts raw channel data into high-level *umbrellas* (categories) using hybrid methods:
  1. **Heuristic rules & keyword weighting** (fast, deterministic).  
  2. **TF-IDF & semantic similarity** for fallback.  
  3. **LLM-assisted “fitting”** using OpenAI for ambiguous or unseen cases.
- Produces artifacts:
  - `fitting_results.csv` — latest classification snapshot.  
  - `assignments.jsonl` — per-channel decision history.  
  - `metrics.json` — coverage, confidence, and label distribution.

**Goal:** ≥ 85 % meaningful classification coverage with minimal manual tagging.

### 3. Digest & Visualization
- Netflix-style rails showing recent uploads grouped by umbrella.
- Channel Picker and Tagging tools for manual overrides.
- Dark-mode responsive UI with Tailwind theming.
- Planned: *topic exploration*, *AI summaries*, and *cross-channel insights*.

### 4. Continuous Learning Loop
- Each run feeds improved labelbooks and anchors.  
- Human-in-the-loop corrections reinforce future auto-classification.  
- Eventually becomes a **personalized taxonomy engine** for YouTube.

---

## 🧠 Strategic Goals

| Area | Near Term (MVP) | Mid Term | Long Term |
|------|------------------|-----------|------------|
| **Classification** | Reliable single-label fitting; 70 %+ coverage | Multi-label & sub-topic mapping | Full semantic clustering |
| **Digest UX** | Stable grid + filters | Cross-channel “Topics” dashboard | Personalized “Daily Brief” |
| **Quota Management** | Basic logging | Smart caching + deferred updates | Auto-throttling + multi-account load balancing |
| **AI Integration** | Forced-choice LLM fitting | Contextual multi-pass reasoning | Local fine-tuned model or embeddings-based |
| **Sharing / Export** | CSV & JSON exports | Sharable “My Digest” URLs | Cloud sync & collaborative digests |

---

## ⚙️ Tech Snapshot
- **Frontend:** React + Vite + TailwindCSS  
- **Backend:** Node.js (Express)  
- **Persistence:** Local JSON (transition path → SQLite or Postgres)  
- **Auth:** Google OAuth 2.0  
- **AI Layer:** OpenAI (LLM fitting, topic labeling)  
- **Tooling:** Cline automation, Patch SOPs, Context Reload system

---

## 🧱 Context Reload Framework
YT-Digest uses a structured, modular context system for long development chains:

1. **Big Picture Context (this file)** — permanent north star.  
2. **Primer.md** — short-term dev focus (phase, micro-step, current experiments).  
3. **Context Capsule.json** — machine-readable resume of latest state.  

Together, these enable seamless hand-offs between long threads or model resets without losing vision or continuity.

---

## 🧭 Guiding Principles
- **Down & Dirty → Good Enough → Refine** — rapid iteration over perfectionism.  
- **Transparency over magic** — every AI decision should be explainable.  
- **Human-in-the-loop** — AI assists, never replaces, human insight.  
- **Local first** — offline-friendly, data stays with the user.  
- **Composable** — small, swappable modules (auth, auto-organize, digest view).

---

## 🔮 Long-View Vision
YT-Digest evolves into a **personal YouTube operating system**:
- Your channels become a *knowledge map* instead of a firehose.
- You get *summaries*, *trends*, and *learning paths* across creators.
- The system quietly classifies, learns, and improves over time — powered by your own preferences, not an opaque algorithm.

---

*This document should remain evergreen.  
When doing a Context Reload, include this alongside the current Primer and JSON capsule so new conversations always retain alignment with YT-Digest’s big-picture purpose and architecture.*
