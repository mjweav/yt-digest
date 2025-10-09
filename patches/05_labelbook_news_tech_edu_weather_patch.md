
# Patch 05 — Labelbook Precision Upgrades (News, Technology, Education) + Weather (CommonJS)

**Goal:** Improve fitting purity and consistency by:
- Expanding **News**, **Technology**, **Education** with precise *siblings*
- Enriching **aliases/exclusions** for the base umbrellas
- Adding a top-level **Weather** umbrella
- (Optional) Let sparse-but-weather channels pass triage by extending the allowlist

This patch is **schema-compatible** with your current `labelbook.json` and your CommonJS toolchain.

---

## 0) Snapshot & Validate

```bash
# Backup
cp data/labelbook.json data/labelbook.backup.json

# (Optional) preview git status
git add -A && git commit -m "pre-Patch05 snapshot" || true

# Validate current schema (sanity)
node -e "console.log(require('./scripts/labelbook.schema.js').validateLabelBook(require('./data/labelbook.json')))"
```

---

## 1) Apply targeted base-umbrella enrichments

Open `data/labelbook.json` and edit the **existing umbrellas** listed below.
If a field is missing, add it. **Do not change the umbrella names** of existing entries.

### 1A) News (base)
```jsonc
{
  "name": "News",
  "definition": "journalism, reporting, and current events",
  "exclusion": "product tutorials or how-to without reporting",
  "aliases": ["current events","breaking","journalism","reporter","headline","geopolitics","press","cnn","bbc","msnbc","reuters","ap"],
  "examples": ["BBC News","Reuters"]
}
```

### 1B) Technology (base)
```jsonc
{
  "name": "Technology",
  "definition": "software, hardware, AI, computing, and devices",
  "exclusion": "coding/developer tutorials (see Programming & Software Dev)",
  "aliases": ["tech","gadget","device","smartphone","iphone","android","app","software","firmware","silicon"],
  "examples": ["MKBHD","The Verge"]
}
```

### 1C) Education (base)
```jsonc
{
  "name": "Education",
  "definition": "teaching and learning across subjects",
  "exclusion": "news commentary without instruction",
  "aliases": ["course","lecture","tutorial","lesson","teacher","school","curriculum","syllabus"],
  "examples": ["Khan Academy","CrashCourse"]
}
```

> Tip: Keep **names** exactly as-is; we’ll add *siblings* in the next step.

---

## 2) Append new siblings to the labelbook

Add these **new umbrella objects** to the `"umbrellas"` array in `data/labelbook.json`.
(Place anywhere; order doesn’t matter.)

### 2A) News siblings
```json
{
  "name": "Politics & World News",
  "definition": "Reporting and analysis on domestic politics, geopolitics, government, and global affairs.",
  "inclusion": "elections, policy, diplomacy, conflicts, international relations",
  "exclusion": "business/market tickers; tech product coverage",
  "aliases": ["politics","geopolitics","policy","election","capitol","parliament","foreign affairs","world news","state department"],
  "examples": ["BBC News","MSNBC"],
  "parents": ["News"]
}
```
```json
{
  "name": "Business & Markets News",
  "definition": "News focused on the economy, companies, investing, and financial markets.",
  "inclusion": "earnings, macroeconomy, inflation, interest rates, equities, startups",
  "exclusion": "personal finance how-tos or long-form investing education",
  "aliases": ["markets","stocks","earnings","IPO","macro","economy","federal reserve","wall street","bloomberg","cnbc"],
  "examples": ["Bloomberg Television","CNBC"],
  "parents": ["News"]
}
```
```json
{
  "name": "Tech & Science News",
  "definition": "News coverage of technology companies, products, research, and scientific developments.",
  "inclusion": "AI breakthroughs, product launches, lab results, journal coverage",
  "exclusion": "how-to tutorials or developer walkthroughs",
  "aliases": ["tech news","science news","product launch","research update","beta","developer conference","keynote","patch notes"],
  "examples": ["The Verge","CNET"],
  "parents": ["News"]
}
```

### 2B) Technology siblings (+ optional AI Tools)
```json
{
  "name": "Consumer Tech & Gadgets",
  "definition": "Reviews and coverage of phones, laptops, cameras, and everyday devices.",
  "inclusion": "unboxings, feature rundowns, comparisons, buyer guides",
  "exclusion": "PC building benchmarks; developer coding tutorials",
  "aliases": ["gadget","smartphone","iphone","android","laptop","tablet","headphones","wearables","camera gear","review"],
  "examples": ["MKBHD","Mrwhosetheboss"],
  "parents": ["Technology"]
}
```
```json
{
  "name": "Programming & Software Dev",
  "definition": "Coding tutorials, frameworks, APIs, and developer tooling.",
  "inclusion": "languages, frameworks, devops, backend/frontend, code walkthroughs",
  "exclusion": "general gadget reviews or PC part builds",
  "aliases": ["programming","coding","developer","python","javascript","typescript","react","node","docker","api","cli","sdk"],
  "examples": ["Fireship","Traversy Media"],
  "parents": ["Technology"]
}
```
```json
{
  "name": "PC Hardware & Builds",
  "definition": "PC parts, performance tuning, and workstation/gaming builds.",
  "inclusion": "benchmarks, GPUs/CPUs, thermals, cases, cooling, overclocking",
  "exclusion": "camera/phone gadget reviews; pure game content",
  "aliases": ["pc build","gpu","cpu","benchmark","motherboard","ram","ssd","thermal","overclock","power supply","case"],
  "examples": ["Gamers Nexus","JayzTwoCents"],
  "parents": ["Technology"]
}
```
**Optional (include if you see these channels):**
```json
{
  "name": "AI Tools & Productivity",
  "definition": "Practical use of AI assistants and tools to get work done.",
  "inclusion": "prompting, workflows, productivity, AI app roundups",
  "exclusion": "ML research papers; theoretical AI alignment",
  "aliases": ["chatgpt","gpt","claude","midjourney","stable diffusion","prompt","agents","workflows","automations","llm tools"],
  "examples": ["Matt Wolfe","AI Explained"],
  "parents": ["Technology"]
}
```

### 2C) Education siblings
```json
{
  "name": "Academic Courses & Lectures",
  "definition": "Structured lectures and course material from academic-style educators.",
  "inclusion": "curriculum-based series, classroom-style lectures, textbook-aligned units",
  "exclusion": "casual how-tos or news commentary",
  "aliases": ["lecture","course","curriculum","syllabus","semester","university","professor","open course","edx"],
  "examples": ["Khan Academy","MIT OpenCourseWare"],
  "parents": ["Education"]
}
```
```json
{
  "name": "How-To & Skills Tutorials",
  "definition": "Practical step-by-step guides for general skills and crafts.",
  "inclusion": "non-academic tutorials (writing, design, soft skills, tools)",
  "exclusion": "programming (see Programming & Software Dev); video editing (use Video Editing)",
  "aliases": ["tutorial","how to","step by step","guide","walkthrough","beginner","intermediate","masterclass"],
  "examples": ["Skillshare-style creators","Ali Abdaal"],
  "parents": ["Education"]
}
```
```json
{
  "name": "Study Skills & Test Prep",
  "definition": "Techniques and resources for studying, exams, and certifications.",
  "inclusion": "memorization, spaced repetition, test strategies, SAT/ACT/MCAT/Bar/Certs",
  "exclusion": "general life productivity (keep in Lifestyle)",
  "aliases": ["study tips","revision","flashcards","anki","exam prep","practice tests","scores","certification"],
  "examples": ["Med School Insiders","Magoosh"],
  "parents": ["Education"]
}
```

### 2D) New top-level umbrella: Weather
```json
{
  "name": "Weather",
  "definition": "Forecasts, meteorology, storm tracking, and severe weather coverage.",
  "inclusion": "daily/weekly forecasts, storm outlooks, hurricane/tornado tracking",
  "exclusion": "climate policy debates (use Politics & World News) or earth science explainers (use Science)",
  "aliases": ["forecast","meteorology","radar","doppler","severe weather","hurricane","tornado","winter storm","NOAA","NWS","outlook","model run"],
  "examples": ["The Weather Channel","Ryan Hall, Y'all"]
}
```

---

## 3) (Optional) Triage allowlist for Weather

If you want sparse-but-weather channels to avoid early triage, extend `scripts/triage.sparse.js`:

```diff
- const ENTITY_ALLOWLIST = new Set([
-   "msnbc","cnn","bbc","espn","nba","nfl","minecraft","fortnite","apple","android","iphone","davinci resolve","premiere pro","blender","adobe","tiktok","disney","marvel","uefa","fifa"
- ]);
+ const ENTITY_ALLOWLIST = new Set([
+   "msnbc","cnn","bbc","espn","nba","nfl","minecraft","fortnite","apple","android","iphone","davinci resolve","premiere pro","blender","adobe","tiktok","disney","marvel","uefa","fifa",
+   "noaa","nws","accuweather","weather channel","storm","hurricane","tornado","forecast","doppler","radar"
+ ]);
```

Save file.

---

## 4) Validate & Re-run (stabilizing pass)

```bash
# Validate labelbook
node -e "console.log(require('./scripts/labelbook.schema.js').validateLabelBook(require('./data/labelbook.json')))"

# Fit with guards
npm run fit:run -- --fresh=1 --resume=1 --verbose=1

# Metrics snapshot
npm run fit:metrics > data/metrics.json
```

**Expected effects:**
- Lower flip-rate on the next pass (clearer separations → consistent assignments)
- Stable or increased median confidence
- Fewer misroutes inside News, Technology, Education
- Weather category future-ready

---

## 5) Rollback plan

If anything looks off:
```bash
git restore data/labelbook.json
# or
cp data/labelbook.backup.json data/labelbook.json
```

Re-validate and re-run when ready.
