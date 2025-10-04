// server/autoOrganize/heuristics2.js (ESM)

const FIELD_WEIGHTS = { title: 3.0, desc: 1.6, url: 0.6 };
const BASELINE = 0;
const MIN_MARGIN = 0.5;

const rx = (parts, flags = "i") => {
  const patterns = parts.map(p => {
    // Escape special regex characters
    const escaped = p.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');
    // Handle multi-word phrases by allowing optional whitespace between words
    return escaped.replace(/ /g, '\\s*');
  });
  return new RegExp(`\\b(?:${patterns.join("|")})\\b`, flags);
};

const CATS = [
  {
    label: "Health & Medicine",
    include: rx([
      "doctor", "dr\\.?\\s", "md\\b", "physician", "medicine", "medical", "cardio", "metabolic", "endocrin",
      "neuro", "sleep", "nutrition", "diet", "fasting", "cholesterol", "insulin", "glucose", "exercise physiology"
    ]),
    exclude: rx([
      // avoid music producer "Doctor Mix", "Dr. Dre", etc.
      "doctor mix", "dr\\.?\\s?dre", "doctor who", "drum", "dj\\b"
    ]),
  },
  {
    label: "AI & Emerging Tech",
    include: rx([
      "ai", "artificial intelligence", "gpt", "chatgpt", "llm", "deep learning",
      "machine learning", "ml\\b", "generative", "midjourney", "stable diffusion", "prompt",
      "karpathy", "openai", "anthropic", "llama", "mistral"
    ]),
    exclude: rx(["makeup ai", "ai art nails"]), // examples of lifestyle overlaps
  },
  {
    label: "General Tech & Reviews",
    include: rx([
      "tech", "review", "unboxing", "gadgets?", "apple", "iphone", "ipad", "mac",
      "android", "windows", "pc build", "benchmark"
    ]),
    exclude: rx(["photography", "camera", "drone", "flight sim"]),
  },
  {
    label: "Photography & Cameras",
    include: rx([
      "camera", "photograph", "lens", "sony", "canon", "nikon", "fujifilm",
      "lightroom", "photoshop", "mirrorless", "brandon li", "allan walls"
    ]),
    exclude: rx(["security camera", "body cam", "dashcam", "marketing", "dropship", "ecom", "crypto", "stocks"]),
  },
  {
    label: "Video Editing & Creative Tools",
    include: rx([
      "edit", "premiere", "final cut", "davinci resolve", "after effects",
      "motionvfx", "filmora", "bretfx", "color grade", "timeline"
    ]),
    exclude: rx(["sales", "agency", "dropship"]),
  },
  {
    label: "Business & Marketing",
    include: rx([
      "marketing", "ads", "adwords", "funnels", "funnel", "sales", "saas",
      "ecommerce", "brand", "branding", "agency", "entrepreneur", "entrepreneurship",
      "startup", "shopify", "amazon fba"
    ]),
    exclude: rx([
      "flight", "storm", "camera", "lens", "photo", "premiere", "filmora",
      "davinci", "final cut", "garden", "seed", "compost", "orchestra",
      "guitar", "mix", "piano", "trailer", "trailers", "clip", "clips",
      "cinema", "movie", "film", "entertainment"
    ]),
  },
  {
    label: "Music & Musicians",
    include: rx([
      "guitar", "bass", "drums", "piano", "vocal", "singer", "songwriter",
      "mix", "master", "daw", "ableton", "logic pro", "pro tools", "pedal",
      "riff", "chord", "jazz"
    ]),
    exclude: rx(["storm", "flight", "pilot", "camera", "lens"]),
  },
  {
    label: "DIY, Home & Construction",
    include: rx(["diy", "home", "renovation", "woodworking", "craftsman", "garage", "concrete", "builder"]),
    exclude: rx([]),
  },

  {
    label: "Weather & Storms",
    include: rx([
      "storm", "tornado", "tornadoes", "hurricane", "hurricanes", "hail", "severe", "severe weather",
      "forecast", "radar", "meteorolog", "meteorologist", "storm chaser", "storm chasing", "chaser",
      "noaa", "nws", "supercell", "twister", "winter storm", "ryan hall", "reed timmer",
      "live storms media", "weather"
    ]),
    exclude: rx([]),
  },
  {
    label: "Aviation & Flight",
    include: rx([
      "pilot", "aviation", "airliner", "jet", "cockpit", "atc", "boeing",
      "airbus", "737", "a320", "sim", "simulator", "flight sim", "mentour",
      "airline", "flight"
    ]),
    exclude: rx([]),
  },
  {
    label: "Gardening & Outdoors",
    include: rx([
      "garden", "gardening", "homestead", "homesteading", "compost", "mulch",
      "seed", "seedling", "raised bed", "orchard", "pruning", "lawn", "landscape", "landscaping",
      "organic food", "grow food"
    ]),
    exclude: rx([]),
  },
  {
    label: "News & Commentary",
    include: rx([
      "news", "breaking", "report", "analysis", "commentary", "opinion",
      "politics", "geopolitics", "world", "international", "global",
      "dw news", "cna", "bbc", "journalism", "correspondents"
    ]),
    exclude: rx([]),
  },
  // …you can append more categories here as needed
];

const LABEL_ALIASES = {
  "AI / ML": "AI & Emerging Tech",
  "Tech Reviews": "General Tech & Reviews",
};

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
