
# 🧩 CLINE TASK: Patch 07 — Dynamic Shortlist Expansion & Quality Tweaks

## 🎯 Objective

Implement the **Dynamic Shortlist & Quality Tweaks** patch across three scripts:

- `scripts/shortlist.keywords.js`
- `scripts/prompt.singlechoice.js`
- `scripts/batch.run.js`

Then perform a **fresh run** (`--fresh=1 --verbose=1`) to validate that the new umbrellas and aliases are active in fitting.

Expected outcome: 
- Console shows total umbrellas > 20
- Verbose log shows mixed new siblings (Programming, AI Tools, Politics, etc.)
- Metrics confirm 25–30 distinct umbrellas

---

## ⚙️ Implementation Tasks

### 1️⃣ Update `scripts/shortlist.keywords.js`

Replace entire file contents with:

```javascript
/**
 * Dynamic shortlist builder
 * - loads every umbrella (including children) from labelbook
 * - indexes aliases + names
 * - returns up to k best matches
 */

const fs = require("fs");

function shortlist({ title, description, labelBook, k = 12 }) {
  const text = `${title} ${description}`.toLowerCase();
  const tokens = text.split(/\W+/).filter(Boolean);
  const wordSet = new Set(tokens);

  // Build flat alias map
  const all = [];
  for (const u of labelBook) {
    const names = [u.name.toLowerCase(), ...(u.aliases || []).map(a => a.toLowerCase())];
    all.push({ ...u, names });
  }

  // Score by keyword hits
  const scored = [];
  for (const u of all) {
    let score = 0;
    for (const n of u.names) {
      const parts = n.split(/\s+/);
      if (parts.some(p => wordSet.has(p))) score += 1;
      if (text.includes(n)) score += 2; // phrase hit
    }
    // parent/child relation bonus
    if (u.parents && u.parents.length) {
      for (const p of u.parents) if (text.includes(p.toLowerCase())) score += 1.5;
    }
    if (score > 0) scored.push({ label: u.name, def: u.definition, score });
  }

  // Sort + slice
  const ranked = scored.sort((a, b) => b.score - a.score).slice(0, k);

  if (ranked.length < 8) {
    console.warn(`⚠️ shortlist underfilled (${ranked.length}/${k}) for "${title.slice(0,60)}..."`);
  }

  return ranked;
}

module.exports = { shortlist };
```

---

### 2️⃣ Update `scripts/prompt.singlechoice.js`

Replace contents with:

```javascript
/**
 * Dynamic prompt builder for single-choice classification
 * - inserts actual shortlist + definitions
 * - merges anchor examples if available
 * - optional --showPrompt=1 prints one sample prompt
 */

const fs = require("fs");

function buildPrompt({ channel, shortlist, anchors = [], showPrompt = false }) {
  const { title, description } = channel;
  const anchorMap = new Map();
  for (const a of anchors) anchorMap.set(a.label, a.example);

  const choices = shortlist
    .map((x, i) => {
      const a = anchorMap.get(x.label);
      const ex = a ? ` Example: ${a}` : "";
      return `${i + 1}. ${x.label} — ${x.def}.${ex}`;
    })
    .join("\n");

  const system = `You are a YouTube content analyst. Choose exactly one label from the shortlist below that best fits the channel. Output JSON only.`;
  const user = `
Channel:
Title: ${title}
Description: ${description}

Shortlist:
${choices}

Respond in JSON:
{"label": "...", "confidence": 0-1, "knowledge_source": "world_knowledge"|"text_clues", "evidence": "short justification"}
`;

  if (showPrompt) {
    console.log("=== Sample Prompt Preview ===\n", user.slice(0, 1000));
  }

  return { system, user };
}

module.exports = { buildPrompt };
```

---

### 3️⃣ Modify `scripts/batch.run.js`

After parsing arguments, add:

```javascript
const shortlistSize = Number(args.shortlist || 12);
const showPrompt = args.showPrompt === "1" || args.showPrompt === "true";
```

At startup, log summary right after labelbook is loaded:

```javascript
console.log(`Loaded labelbook: ${labelBook.length} umbrellas`);
let aliasTotal = 0;
for (const u of labelBook) aliasTotal += (u.aliases || []).length;
console.log(`Indexed aliases: ${aliasTotal}`);
```

When generating the shortlist, replace the existing call with:

```javascript
const list = shortlist({
  title,
  description,
  labelBook,
  k: shortlistSize
});
```

When calling the prompt builder, modify to include the new flag:

```javascript
const { system, user } = buildPrompt({
  channel: { title, description },
  shortlist: list,
  anchors,
  showPrompt
});
```

---

## 🧪 Validation

After implementation, run:

```bash
npm run fit:run -- --fresh=1 --verbose=1
```

Expected console log:
```
Loaded labelbook: 27 umbrellas
Indexed aliases: 300+
```
Then verbose shortlist samples should include the new sibling categories (Programming & Software Dev, AI Tools, Politics & World News, etc.).

When the run completes, verify:
- `fitting_results.csv` includes new sibling labels.
- `metrics.json` lists 25–30 umbrella categories.

---

## ✅ Completion Criteria

- All three scripts updated successfully.
- Full fresh run completes without errors.
- Console confirms full labelbook load.
- Metrics reflect all new umbrellas and aliases.

---

## 🩵 End of Task

Once done, leave a commit message:
```
feat: Patch 07 — Dynamic Shortlist Expansion & Quality Tweaks
```
