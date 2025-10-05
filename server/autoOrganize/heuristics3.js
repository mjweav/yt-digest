// server/autoOrganize/heuristics3.js (ESM)
// AO Parent/Subcluster Pivot - Coarse parent classification only

const FIELD_WEIGHTS = { title: 3.0, desc: 1.6, url: 0.6 };
const BASELINE = 0;
const MIN_MARGIN = 0.35;

// Build a single alternation regex from tokens:
//  - "word"        -> \bword\b
//  - "multi word"  -> \bmulti\s+word\b
//  - "prefix*"     -> \bprefix\w*
// Returns a global, case-insensitive RegExp.
function buildPattern(tokens) {
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const asPiece = (t) => {
    const raw = t.trim().toLowerCase();
    if (!raw) return null;
    const isPrefix = raw.endsWith('*');
    const core = isPrefix ? raw.slice(0, -1) : raw;
    if (core.includes(' ')) {
      // phrase
      return `\\b${core.split(/\s+/).map(esc).join('\\s+')}\\b`;
    }
    // single token
    return isPrefix
      ? `\\b${esc(core)}\\w*`
      : `\\b${esc(core)}\\b`;
  };
  const parts = (tokens || []).map(asPiece).filter(Boolean);
  if (!parts.length) return null;
  return new RegExp(`(?:${parts.join('|')})`, 'gi');
}

// 10 Coarse parent categories for AO Parent/Subcluster Pivot
const CATS = [
  {
    label: "Music & Musicians",
    include: buildPattern([
      "music", "musician", "guitar", "bass", "drums", "piano", "vocal", "singer", "songwriter",
      "mix", "master", "daw", "ableton", "logic pro", "pro tools", "pedal",
      "riff", "chord", "jazz", "concert", "symphony", "orchestra", "classical",
      "band", "album", "song", "music video", "live music"
    ]),
    exclude: buildPattern([
      "storm", "flight", "pilot", "camera", "lens"
    ]),
  },
  {
    label: "News & Commentary",
    include: buildPattern([
      "news", "breaking", "report", "analysis", "commentary", "opinion",
      "politics", "geopolitics", "world", "international", "global",
      "journalism", "correspondents"
    ]),
    exclude: buildPattern([]),
  },
  {
    label: "Tech & Software",
    include: buildPattern([
      "tech", "software", "programming", "coding", "javascript", "python", "java",
      "react", "node.js", "api", "database", "algorithm", "web development",
      "computer", "laptop", "smartphone", "app", "application"
    ]),
    exclude: buildPattern([]),
  },
  {
    label: "Business & Finance",
    include: buildPattern([
      "business", "finance", "investing", "stock", "trading", "entrepreneur",
      "startup", "marketing", "sales", "ecommerce", "brand", "agency",
      "financial", "portfolio", "wealth", "money"
    ]),
    exclude: buildPattern([]),
  },
  {
    label: "Health & Fitness",
    include: buildPattern([
      "health", "fitness", "doctor", "medical", "medicine", "nutrition", "diet",
      "exercise", "workout", "gym", "training", "physiology", "sleep",
      "mental health", "wellness", "therapy"
    ]),
    exclude: buildPattern([]),
  },
  {
    label: "DIY/Home/Services",
    include: buildPattern([
      "diy", "home", "renovation", "woodworking", "craftsman", "garage",
      "construction", "repair", "maintenance", "cleaning", "landscaping",
      "plumbing", "electrician", "contractor"
    ]),
    exclude: buildPattern([]),
  },
  {
    label: "Science & Education",
    include: buildPattern([
      "science", "education", "research", "university", "professor", "academic",
      "physics", "chemistry", "biology", "mathematics", "lecture", "seminar",
      "institute", "laboratory", "experiment", "theory"
    ]),
    exclude: buildPattern([]),
  },
  {
    label: "Entertainment/Comedy",
    include: buildPattern([
      "entertainment", "comedy", "movie", "film", "cinema", "hollywood",
      "netflix", "disney", "marvel", "animation", "actor", "actress",
      "show", "series", "episode", "comedy", "funny", "humor"
    ]),
    exclude: buildPattern([]),
  },
  {
    label: "Travel/Vlogs",
    include: buildPattern([
      "travel", "vlog", "trip", "vacation", "holiday", "adventure",
      "backpacking", "road trip", "wanderlust", "nomad", "expat",
      "culture", "explore", "destination", "blog"
    ]),
    exclude: buildPattern([]),
  },
  {
    label: "Unclassified",
    include: buildPattern([]),
    exclude: buildPattern([]),
  },
];

function scoreOne(cat, fields) {
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

  // Apply title nudges for specific high-signal names
  const title = fields.title || '';

  // Alex Hormozi → Business & Finance
  if (/\bAlex\s+Hormozi\b/i.test(title) && cat.label === "Business & Finance") {
    s += 2.0;
  }

  // The Voice → Music & Musicians
  if (/\bThe\s+Voice\b/i.test(title) && cat.label === "Music & Musicians") {
    s += 2.0;
  }

  return s;
}

export function classifyChannel({ title, desc, url }) {
  const fields = {
    title: (title || "").toLowerCase(),
    desc:  (desc  || "").toLowerCase(),
    url:   (url   || "").toLowerCase(),
  };

  let best = { label: null, score: -Infinity };
  let runner = { label: null, score: -Infinity };
  const perCat = [];

  for (const cat of CATS) {
    const rawScore = scoreOne(cat, fields);
    perCat.push({ label: cat.label, score: rawScore });
    if (rawScore > best.score) {
      runner = best;
      best = { label: cat.label, score: rawScore };
    } else if (rawScore > runner.score) {
      runner = { label: cat.label, score: rawScore };
    }
  }

  // Apply title-contains-label keyword bump (+0.75) before tie-break
  if (best.score > BASELINE) {
    let bestIndex = -1;
    for (let i = 0; i < CATS.length; i++) {
      if (CATS[i].label === best.label) {
        bestIndex = i;
        break;
      }
    }

    if (bestIndex >= 0) {
      const bestCat = CATS[bestIndex];
      if (bestCat.include && bestCat.include.test(fields.title)) {
        best.score += 0.75; // Title hit boost
      }
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
      if (CATS[i].label === best.label) bestIndex = i;
      if (CATS[i].label === runner.label) runnerIndex = i;
    }

    if (bestIndex >= 0 && runnerIndex >= 0) {
      const bestCat = CATS[bestIndex];
      const runnerCat = CATS[runnerIndex];

      // Check which category hits the title
      const bestHitsTitle = bestCat.include.test(fields.title);
      const runnerHitsTitle = runnerCat.include.test(fields.title);

      if (bestHitsTitle && !runnerHitsTitle) {
        chosen = best.label;
      } else if (runnerHitsTitle && !bestHitsTitle) {
        chosen = runner.label;
      } else {
        // Both hit title or both don't - compare total hits across all fields
        let bestTotalHits = 0, runnerTotalHits = 0;

        for (const [fieldName, text] of Object.entries(fields)) {
          if (text) {
            const bestMatches = text.match(bestCat.include);
            const runnerMatches = text.match(runnerCat.include);
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
