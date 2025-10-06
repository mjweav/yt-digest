// server/autoOrganize/heuristics2.js (ESM)
// Externalized rules from rules.json

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load rules from external file
async function loadRules() {
  const rulesPath = path.join(__dirname, 'rules.json');
  try {
    const rulesData = await fsp.readFile(rulesPath, 'utf8');
    return JSON.parse(rulesData);
  } catch (error) {
    console.error('Error loading rules:', error);
    // Fallback to empty rules if file doesn't exist
    return {
      fieldWeights: { title: 3.0, desc: 1.6, url: 0.6 },
      baseline: 0,
      minMargin: 0.5,
      categories: [],
      labelAliases: {}
    };
  }
}

// Cache for loaded rules
let rulesCache = null;

async function getRules() {
  if (!rulesCache) {
    rulesCache = await loadRules();
  }
  return rulesCache;
}

const rx = (parts, flags = "i") => {
  const patterns = parts.map(p => {
    // Escape special regex characters
    const escaped = p.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');
    // Handle multi-word phrases by allowing optional whitespace between words
    return escaped.replace(/ /g, '\\s*');
  });
  return new RegExp(`\\b(?:${patterns.join("|")})\\b`, flags);
};

// Convert category data to regex patterns
async function buildCategories() {
  const rules = await getRules();
  return rules.categories.map(cat => ({
    label: cat.label,
    include: cat.include.length > 0 ? rx(cat.include) : null,
    exclude: cat.exclude.length > 0 ? rx(cat.exclude) : null,
  }));
}

const LABEL_ALIASES = {
  "AI / ML": "AI & Emerging Tech",
  "Tech Reviews": "General Tech & Reviews",
};

// Async function to get constants from rules file
async function getConstants() {
  const rules = await getRules();
  return {
    FIELD_WEIGHTS: rules.fieldWeights,
    BASELINE: rules.baseline,
    MIN_MARGIN: rules.minMargin,
    CATS: await buildCategories(),
    LABEL_ALIASES: { ...LABEL_ALIASES, ...rules.labelAliases }
  };
}

function scoreOne(cat, fields, FIELD_WEIGHTS) {
  let s = 0;
  const { include, exclude } = cat;
  if (exclude) {
    for (const text of Object.values(fields)) {
      if (text && exclude.test(text)) return -999;
    }
  }
  if (include) {
    for (const [k, text] of Object.entries(fields)) {
      if (!text) continue;
      const hits = text.match(include);
      if (hits) s += hits.length * (FIELD_WEIGHTS[k] || 1);
    }
  }
  return s;
}

export async function classifyChannel({ title, desc, url }) {
  const { FIELD_WEIGHTS, BASELINE, MIN_MARGIN, CATS, LABEL_ALIASES } = await getConstants();

  const fields = {
    title: (title || "").toLowerCase(),
    desc:  (desc  || "").toLowerCase(),
    url:   (url   || "").toLowerCase(),
  };

  let best = { label: null, score: -Infinity };
  let runner = { label: null, score: -Infinity };
  const perCat = [];

  for (const cat of CATS) {
    const rawScore = scoreOne(cat, fields, FIELD_WEIGHTS);
    const label = LABEL_ALIASES[cat.label] || cat.label;
    perCat.push({ label, score: rawScore });
    if (rawScore > best.score) {
      runner = best;
      best = { label, score: rawScore };
    } else if (rawScore > runner.score) {
      runner = { label, score: rawScore };
    }
  }

  let chosen = null;
  if (best.score > BASELINE && (best.score - runner.score >= MIN_MARGIN)) {
    chosen = best.label;
  } else if (best.score > BASELINE && (best.score - runner.score < MIN_MARGIN)) {
    // Tie-break fallback logic
    let bestIndex = -1, runnerIndex = -1;

    // Find indices of best and runner categories
    for (let i = 0; i < CATS.length; i++) {
      const cat = CATS[i];
      const label = LABEL_ALIASES[cat.label] || cat.label;
      if (label === best.label) bestIndex = i;
      if (label === runner.label) runnerIndex = i;
    }

    if (bestIndex >= 0 && runnerIndex >= 0) {
      const bestCat = CATS[bestIndex];
      const runnerCat = CATS[runnerIndex];

      // Check which category hits the title
      const bestHitsTitle = bestCat.include && bestCat.include.test(fields.title);
      const runnerHitsTitle = runnerCat.include && runnerCat.include.test(fields.title);

      if (bestHitsTitle && !runnerHitsTitle) {
        chosen = best.label;
      } else if (runnerHitsTitle && !bestHitsTitle) {
        chosen = runner.label;
      } else {
        // Both hit title or both don't - compare total hits across all fields
        let bestTotalHits = 0, runnerTotalHits = 0;

        for (const [fieldName, text] of Object.entries(fields)) {
          if (text) {
            const bestMatches = bestCat.include && text.match(bestCat.include);
            const runnerMatches = runnerCat.include && text.match(runnerCat.include);
            if (bestMatches) bestTotalHits += bestMatches.length;
            if (runnerMatches) runnerTotalHits += runnerMatches.length;
          }
        }

        if (bestTotalHits > runnerTotalHits) {
          chosen = best.label;
        } else if (runnerTotalHits > bestTotalHits) {
          chosen = runner.label;
        }
        // If still tied, leave as null (Unclassified)
      }
    }
  }

  return {
    label: chosen,
    scores: perCat.sort((a, b) => b.score - a.score).slice(0, 5),
    best,
    runner,
  };
}
