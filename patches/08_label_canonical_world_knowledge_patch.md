
# 🧩 CLINE TASK — Patch 08: Canonical Labels, World‑Knowledge Boost, Music Merge, Shortlist Backfill

## 🎯 Goal
Tighten classification quality by:
1) Forcing **canonical label names** (no long descriptive strings in the `label` field).  
2) Encouraging/recording **world_knowledge** where appropriate.  
3) **Merging Music variants** into one umbrella with richer aliases.  
4) **Backfilling shortlists** when keyword hits are sparse, so the model always has robust options.

You’ll update three scripts and the labelbook, then run a **fresh** fit to validate.

---

## 📁 Files to edit
- `scripts/shortlist.keywords.js` (shortlist backfill)
- `scripts/prompt.singlechoice.js` (canonical label constraint + world-knowledge instruction)
- `scripts/batch.run.js` (response validation: ensure label ∈ shortlist)
- `data/labelbook.json` (Music merge: collapse variants to “Music” + aliases)

---

## 1) Update `scripts/shortlist.keywords.js` — add backfill
**Replace the whole file** with the version below if you already applied Patch 07; otherwise, merge carefully.

```javascript
/**
 * Dynamic shortlist builder with backfill
 * - uses all umbrellas (incl. children) from labelbook
 * - indexes aliases + names
 * - scores by keyword hits
 * - backfills to k with generic/popular umbrellas if underfilled
 */

function shortlist({ title, description, labelBook, k = 12, backfill = [] }) {
  const text = `${title || ""} ${description || ""}`.toLowerCase();
  const tokens = text.split(/\W+/).filter(Boolean);
  const wordSet = new Set(tokens);

  const all = [];
  for (const u of labelBook) {
    const names = [u.name.toLowerCase(), ...(u.aliases || []).map(a => a.toLowerCase())];
    all.push({ ...u, names });
  }

  const scored = [];
  for (const u of all) {
    let score = 0;
    for (const n of u.names) {
      const parts = n.split(/\s+/);
      if (parts.some(p => wordSet.has(p))) score += 1;
      if (text.includes(n)) score += 2; // phrase match
    }
    if (u.parents && u.parents.length) {
      for (const p of u.parents) if (text.includes(String(p).toLowerCase())) score += 1.5;
    }
    if (score > 0) scored.push({ label: u.name, def: u.definition, score });
  }

  let ranked = scored.sort((a, b) => b.score - a.score).slice(0, k);

  // Backfill with popular/generic umbrellas if we’re short
  if (ranked.length < k && backfill && backfill.length) {
    const need = k - ranked.length;
    const have = new Set(ranked.map(x => x.label));
    for (const b of backfill) {
      if (have.has(b.label)) continue;
      ranked.push({ label: b.label, def: b.def || "", score: 0 });
      if (ranked.length >= k) break;
    }
  }

  if (ranked.length < 8) {
    console.warn(`⚠️ shortlist underfilled (${ranked.length}/${k}) for "${(title || '').slice(0,60)}..."`);
  }

  return ranked;
}

module.exports = { shortlist };
```

---

## 2) Update `scripts/prompt.singlechoice.js` — canonical label + world knowledge

**Replace file** with:

```javascript
/**
 * Prompt builder (single-choice)
 * - Inserts dynamic shortlist + definitions
 * - Encourages use of BOTH text clues and world knowledge
 * - Forces canonical label return (exactly one, must match provided labels)
 */

function buildPrompt({ channel, shortlist, anchors = [], showPrompt = false }) {
  const { title = "", description = "" } = channel;
  const anchorMap = new Map();
  for (const a of anchors) anchorMap.set(a.label, a.example);

  const labelsOnly = shortlist.map(x => x.label);
  const choices = shortlist
    .map((x, i) => {
      const a = anchorMap.get(x.label);
      const ex = a ? ` Example: ${a}` : "";
      return `${i + 1}. ${x.label} — ${x.def || ""}${ex}`.trim();
    })
    .join("\n");

  const system = `You are a precise YouTube content analyst.
Use BOTH:
• world knowledge (famous people, outlets, bands, shows, brands, etc.)
• text clues in the channel title/description.
Choose EXACTLY ONE label from the shortlist. Output STRICT JSON matching the schema.`;

  // Machine-readable guard: labels array provided explicitly
  const user = `
Channel:
Title: ${title}
Description: ${description}

Shortlist (human readable):
${choices}

Shortlist (labels array, machine-readable):
${JSON.stringify(labelsOnly)}

Respond in JSON ONLY with this schema:
{"label": "<one of the labels exactly as given above>",
 "confidence": <0..1>,
 "knowledge_source": "world_knowledge" | "text_clues" | "both",
 "evidence": "<short justification>"}
`;

  if (showPrompt) {
    console.log("=== Sample Prompt Preview ===\n", user.slice(0, 1200));
  }

  return { system, user };
}

module.exports = { buildPrompt };
```

---

## 3) Update `scripts/batch.run.js` — pass backfill & validate label

**Edits to make:**
- After args parsing:
```javascript
const shortlistSize = Number(args.shortlist || 12);
const showPrompt = args.showPrompt === "1" || args.showPrompt === "true";
```

- Define a **generic backfill** (tweak to your taxonomy as needed):
```javascript
const BACKFILL = [
  { label: "News", def: "journalism, reporting, and current events" },
  { label: "Technology", def: "software, hardware, AI, computing, devices" },
  { label: "Education", def: "instructional and learning content" },
  { label: "Lifestyle", def: "daily life, self-improvement, vlogs" },
  { label: "Music", def: "music performance, lessons, production" },
  { label: "Film & TV", def: "movies, shows, trailers, cinema" },
  { label: "Gaming", def: "video games, reviews, playthroughs" },
  { label: "Sports", def: "athletics, teams, competitions" },
  { label: "Home & Garden", def: "DIY, renovation, gardening" },
  { label: "Cooking", def: "food, recipes, culinary" },
  { label: "Health & Fitness", def: "wellness, exercise, nutrition" },
  { label: "Travel", def: "trips, destinations, exploration" }
];
```

- **Startup visibility** (after loading labelbook):
```javascript
console.log(`Loaded labelbook: ${labelBook.length} umbrellas`);
let aliasTotal = 0;
for (const u of labelBook) aliasTotal += (u.aliases || []).length;
console.log(`Indexed aliases: ${aliasTotal}`);
```

- **Shortlist call** (add `backfill` + `k`):
```javascript
const list = shortlist({
  title,
  description,
  labelBook,
  k: shortlistSize,
  backfill: BACKFILL
});
```

- **Post-LLM validation** (ensure canonical label is returned).  
After parsing the model JSON, **add this guard**:
```javascript
function normalizeLabel(lbl) {
  if (!lbl) return "";
  // strip spaces around em-dash or hyphenated definitions accidentally included
  return String(lbl).split("—")[0].split(" - ")[0].trim();
}

const allowed = new Set(list.map(x => x.label));
let picked = normalizeLabel(result.label);

// exact match, or case-insensitive fallback
if (!allowed.has(picked)) {
  for (const a of allowed) {
    if (a.toLowerCase() === picked.toLowerCase()) { picked = a; break; }
  }
}

// final guard: if still not in shortlist, mark low-confidence unclassified
if (!allowed.has(picked)) {
  console.warn(`⚠️ Model returned non-canonical label "${result.label}". Coercing to Unclassified (low confidence).`);
  picked = "Unclassified (low confidence)";
  result.confidence = Math.min(result.confidence || 0.2, 0.2);
  result.knowledge_source = result.knowledge_source || "text_clues";
  result.evidence = (result.evidence || "") + " [auto-coerced invalid label output]";
}
result.label = picked;

// also prefer richer source tagging if both signals exist
if (result.knowledge_source === "world_knowledge" && (title && description)) {
  result.knowledge_source = "both";
}
```

---

## 4) Update `data/labelbook.json` — Music merge
Goal: Collapse scattered music variants into **one umbrella** (“Music”) with rich aliases.

**Actions:**
- Ensure a single umbrella object exists with `"name": "Music"` and add aliases like:
  - `"official channel"`, `"official music"`, `"band"`, `"artist"`, `"singer"`, `"guitar"`, `"drums"`, `"bass"`, `"studio"`, `"concert"`, `"tour"`, `"label"`, `"record label"`, `"producer"`, `"synth"`, `"orchestra"`, `"choir"`, `"vocal"`, `"live session"`, `"music competition"`, `"The Voice"`, `"idol"`, `"playlist"`
- **Remove** separate umbrellas like `"Music Band"`, `"Music Competition"`, etc., or convert them to **aliases** on “Music”.
- Keep the concise definition, e.g.:
  - `"definition": "music performance, lessons, and production"`

---

## 5) Run a **fresh** fit
After edits, run:
```bash
npm run fit:run -- --fresh=1 --verbose=1
```

### You should see
- No more long descriptive strings in the `label` column.
- More frequent `knowledge_source: "both"` or `"world_knowledge"` for famous entities.
- Fewer “shortlist underfilled” warnings (backfill kicks in).
- Music assignments gravitating to a single “Music” umbrella.

---

## ✅ Commit
```
feat: Patch 08 — Canonical labels, world-knowledge boost, shortlist backfill, Music merge
```
