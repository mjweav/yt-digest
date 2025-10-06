# Idea Harvest from Archive.zip (Python project)

This is a **contained review** of the uploaded Python mini-project. The goal is to surface **transplantable patterns** for YT‑Digest’s **LWLL (Like With Like, then Label)** pipeline — _without_ derailing our current codebase or introducing heavy dependencies.

---

## What’s inside the zip (high level)
- **Extraction scripts**: `extract_gpt_questions.py`, `extract_gpt_titles.py`, `inspect_structure.py`
- **Heuristic + ML classifiers**: `classify_gpt_questions.py` (TF‑IDF + KMeans), `classify_gpt_questions_api_good_category.py`, `!classify_gpt_questions_api_good_context.py` (uses OpenAI + a **classification library** cache)
- **Post-processing**: `process_unique_categories from classified.py`
- A short **tech summary** docx (classification concepts)

These revolve around: _extract → represent (TF‑IDF) → cluster → label → cache exemplars → post‑process_.

---

## Transplantable patterns (ranked by usefulness)

### 1) **Classification Library** (exemplar memory) — _high impact_
Keep a small, persistent library of labeled exemplars (title+desc → label). On a new item, compute similarity vs exemplars and **vote** the label.

**Why it helps AO:** Works as a stable, user‑personalized “prior” on top of our TF‑IDF fallback. No tokens needed.

**JS sketch:**
```ts
type Exemplar = { id: string; label: string; vec: Map<string, number> }; // sparse tfidf
type Lib = { updatedAt: number; items: Exemplar[] };

function voteLabel(vec: Map<string,number>, lib: Lib, k=12): {label?:string, votes:Record<string,number>} {
  const sims = lib.items.map(e => ({ e, s: cosineSparse(vec, e.vec) }))
                        .sort((a,b)=>b.s-a.s).slice(0,k);
  const votes: Record<string,number> = {};
  for (const {e,s} of sims) votes[e.label] = (votes[e.label]||0) + (s>0 ? 1 : 0);
  const top = Object.entries(votes).sort((a,b)=>b[1]-a[1])[0];
  return { label: top?.[0], votes };
}
```

---

### 2) **Two prompt modes: _Category_ vs _Context_** — _medium → future AI labeler_
Your Python project has two good OpenAI modes: **category‑driven** and **context‑driven**. We can mirror this as optional, cached labelers:
- **Category mode**: “Pick the best label from this list” → consistent taxonomy.
- **Context mode**: “Describe the topic in 3–5 words” → good for **auto labels** of emergent clusters.

**How to use in AO:** Only for **labeling clusters**, never to group. Cache results per cluster ID. No calls during scrolling.

**JS labeler stub (behind a feature flag):**
```ts
async function labelClusterContextual(exemplars: string[]): Promise<string> {
  // call server -> OpenAI only if not cached; cache by hash(exemplars.join('|'))
  // returns short label like "Commercial Aviation" or "Jazz Guitarists"
  return "placeholder";
}
```

---

### 3) **Row‑limit / sampling** control — _small, but keeps agents fast_
The scripts use a **row_limit** knob. For AO builds, we can similarly:
- Limit **first‑pass** TF‑IDF to recent/visible clusters, 
- Defer rare tails to a background recompute (manual “Recompute” button, which we already have).

**AO fit:** Our recompute already exists. Add an optional `?sample=N` to debug exports; never slurp entire JSON into LLMs.

---

### 4) **Top terms per cluster** output — _great for label suggestions_
The KMeans script prints **top TF‑IDF terms per cluster**. We can do the same for our clusters to power the **non‑AI labeler** and tooltips.

**JS sketch:**
```ts
function topTermsForCluster(vecs: Map<string,number>[], topN=8): string[] {
  const tally = new Map<string, number>();
  for (const v of vecs) for (const [t,w] of v) tally.set(t, (tally.get(t)||0) + w);
  return [...tally.entries()].sort((a,b)=>b[1]-a[1]).slice(0,topN).map(([t])=>t);
}
```

---

### 5) **Unique‑category post‑processing** — _useful for the UI_
The Python `process_unique_categories` extracts **one representative example per category**. AO can surface **exemplars** for each cluster (first or most similar), useful for hover cards and sanity‑checking.

**JS sketch:**
```ts
function pickExemplar(channelsInCluster: {id:string, vec:Map<string,number>}[], centroid: Map<string,number>) {
  let best = { id: "", s: -1 };
  for (const ch of channelsInCluster) {
    const s = cosineSparse(ch.vec, centroid);
    if (s > best.s) best = { id: ch.id, s };
  }
  return best.id;
}
```

---

### 6) **Simple TF‑IDF in pure JS** — _we already do this, keep it tiny_
The project uses `sklearn` TF‑IDF, but AO uses a tiny custom TF‑IDF. Keep ours:
- tokenize `title + desc` → lower → filter stopwords → 1–2 grams optional
- df counts → idf = log(N/df) → tfidf = tf * idf

**Cosine on sparse maps:**
```ts
function cosineSparse(a: Map<string,number>, b: Map<string,number>) {
  let dot = 0, na = 0, nb = 0;
  for (const [,va] of a) na += va*va;
  for (const [,vb] of b) nb += vb*vb;
  const keys = a.size < b.size ? a : b;
  for (const [k, va] of keys) {
    const vb = (a===keys) ? (b.get(k)||0) : (a.get(k)||0);
    dot += va * vb;
  }
  return dot === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}
```

---

### 7) **Incremental library updates** — _great DX_
The Python scripts pickle a library of classified items. AO can mirror that:
- When the user **confirms** an assignment or edits a label → add to library.
- On recompute, use the updated library to steer TF‑IDF fallback.

**Benefit:** System adapts to each user over time without global rule churn.

---

### 8) **“Why” fields in debug** — _we already do this: keep enriching_
Python scripts dump reason strings; AO has `why.method`, `bestScore`, `margin`, `topNeighbor`. Keep adding:
- top terms that contributed to the score (for the cluster/label shown)
- exemplar ID used to inspire a label
This accelerates tuning and user trust.

---

## Low‑risk improvements we can port next
1. **Better phrase stems**: Python used lightweight context prompts. In AO, ensure our `buildPattern()` already supports **multi‑word** and **prefix** (it does). We can add **short domain lexicons** per vertical (e.g., “matterport, pano2vr” we started).
2. **Cluster exemplars & titles**: Use the “top terms per cluster” + exemplar pick to produce auto labels without AI.
3. **Library cold‑start**: Seed the classification library with a few broad, generic exemplars (e.g., 5–10 per macro theme). Users’ edits quickly personalize.

---

## What not to port (yet)
- Heavy sklearn dependencies (we don’t need them in Node for AO).
- Running OpenAI per channel (we’ll only do **per cluster** labels, cached).

---

## Minimal files we might add to YT‑Digest (in a later microstep)
```
server/autoOrganize/lib/classificationLibrary.js  # load/save exemplar library (JSON)
server/autoOrganize/lib/tfidf.js                  # tiny TF‑IDF + cosine
server/autoOrganize/labeler/heuristicLabeler.js   # top terms → label
server/autoOrganize/labeler/aiLabeler.js          # optional, cached
```

---

## Quick win snippet: exemplar-augmented fallback (drop-in idea)
```ts
// Inside builder.js, TF-IDF fallback:
const lib = loadClassificationLibrary(); // fast JSON
const vec = tfidf(channelText);
const voted = voteLabel(vec, lib, 12);
if (!finalLabel && voted.label && neighborsTopSim >= 0.18 && voted.votes[voted.label] >= 3) {
  finalLabel = voted.label;
  why.method = 'tfidf+lib';
  why.votes = voted.votes;
}
```

---

### TL;DR
Your Python project reinforces a **memory-augmented LWLL** pattern:
- Keep a **library** of labeled exemplars,
- Use **TF‑IDF cosine** for like‑with‑like voting,
- Label clusters with either **top terms** or a minimal, **cached AI** call.

This slots neatly into our current AO branch with minimal risk and no runtime token costs (unless you flip on the cached AI labeler).
