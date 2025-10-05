# YT‑Digest — Auto‑Organize (AO) Big Picture Plan
_Last updated: 2025‑10‑04_

This doc is **for us** (concept/architecture) — not a repo spec. It captures the north‑star and the near‑term steps so we don’t lose the thread while we iterate on clustering quality, montage packing, and UI polish.

---

## 1) Vision
- **Classic Picker** = filterable list for deliberate curation.
- **Auto‑Organize (AO)** = memory‑jogger: show **Smart Clusters** (data‑driven) to help bulk‑assign channels into **My Categories** (user‑managed, Digest‑aware).
- **LWLL**: _Like With Like, then Label_. Clustering is the engine, labels are the UX sugar.

---

## 2) Terms (keep them distinct)
- **Clusters**: ephemeral, computed groupings (AO). Cached for speed but safe to recompute.
- **Categories**: user‑owned groupings (“My Categories”). Digest only reads these.
- **Mappings**: optional links from a cluster → one or more categories, with an optional **sync** behavior.

---

## 3) Data — what we cache vs what’s source of truth
**Source of truth**
- `categories.json`, `channelCategories.json` — user data.

**AO cache (additive, safe to blow away)**
- `autoOrganize.json` (clusters):  
  ```json
  {
    "clusters": [
      {
        "clusterId": "hash(sortedChannelIds + params)",
        "label": "Aviation & Flight",
        "channels": ["UC…", "UC…"],
        "topTerms": ["pilot", "cockpit", "boeing", "atc"],
        "exemplarId": "UC…",
        "methodStats": {"heuristic": 410, "tfidf": 87}
      }
    ]
  }
  ```
- `autoOrganize.meta.json` (build info): `{ "builtAt": "...", "buildVersion": 3, "params": {...}, "channelFingerprint": "..." }`
- `categoryMappings.json` (bridge): `{ "<clusterId>": { "categoryIds": ["cat123"], "sync": true } }`

---

## 4) Back‑end — algorithmic stance
- **Heuristics**: fast precision nets (phrases + stems) with tie‑breakers.
- **TF‑IDF fallback**: dataset‑adaptive, nearest‑neighbors → majority vote.
- **(Later)** Sentence embeddings optional, cached; used only for **clusters**, not per‑channel at scroll time.
- **Exemplar Library (optional, later)**: user‑confirmed assignments become exemplars to steer future votes.

---

## 5) Front‑end — UX stance
- **Cluster header**: label + topTerms chips + exemplar mini + kebab with:
  - Adopt as Category
  - Map to Category…
  - Toggle Sync (if mapped)
- **Channel nodes**: circle avatar + title, **assigned** visuals (ring + check), tooltip (desc, counts).
- **Toolbar**: search, recompute, filters (mapped/unmapped/hidden), “Show hidden clusters”.
- **Packing**: montage layout (minimize whitespace) while preserving cluster color & rounded container.

---

## 6) Mapping behavior
- **Adopt cluster** → create category (prefill with cluster label/color), optionally bulk‑assign all members.
- **Map cluster** → link clusterId → categoryId(s); options:
  - Assign all now
  - **Sync on**: future recomputes auto‑assign new members; surface “Cluster changed” if composition drift is high.
- **Never** auto‑unassign without explicit user action.

---

## 7) Recompute semantics
- Stable `clusterId` via hash(sorted member IDs + params).
- If a mapped cluster disappears, keep the category; show a notice in AO (“source cluster missing this build”).
- `autoOrganize.meta.json` records params & fingerprints for debugging diffs across builds.

---

## 8) Sequence (microsteps)
- **2.x** _(now)_: Improve classification quality (tokens, desc hydration), TF‑IDF fallback, debug.
- **3.0**: AO cache shape — add `clusterId`, `topTerms`, `exemplarId`, `meta.json`.
- **3.1**: Mapping storage & routes (`categoryMappings.json`, adopt/map/sync endpoints).
- **3.2**: UI actions on cluster headers (Adopt/Map, Sync toggle, mapped badge, filters).
- **3.3**: Safe sync engine (on recompute, add new members; drift badge).
- **3.4**: Label polish — edit cluster label; optional cached AI labeler for clusters only.
- **3.5**: Montage packer improvements (organic grid; reduce whitespace).
- **3.6**: Export/backup AO state (cache + mappings) for users.

---

## 9) Open questions (to answer while we build)
- What’s the best **drift threshold** (e.g., Jaccard < 0.6) to alert users?
- Should sync apply only to **additions**, never removals?
- How do we present **conflicts** (channel belongs to multiple mapped clusters)?
- Where to surface **provenance** in Classic Picker (e.g., “via AO: Aviation” chip)?
- When to flip on **embedding‑based labeling** (flag + cache)?

---

## 10) Success metrics
- Time‑to‑first‑assignment (TTFA) in AO (median).
- % channels assigned to **at least one** user category after first session.
- Unclassified rate in AO debug (trend).
- User ops: “Adopt cluster”, “Map cluster”, “Bulk assign” conversion rates.
- Drift notifications acknowledged vs ignored.

---

## 11) Guardrails
- Clusters never mutate user categories without explicit mapping/sync.
- AO cache is disposable; user data isn’t.
- Any AI use is **cluster‑level** and **cached** (no per‑channel runtime costs).

---

### TL;DR
**Clusters discover**, **Categories curate**, and a small **Mapping** layer connects them — all powered by **LWLL**. We’ll lock the cache/meta shape (3.0), add mapping routes (3.1), then wire the UI actions (3.2) while continuing to refine clustering and packing.
