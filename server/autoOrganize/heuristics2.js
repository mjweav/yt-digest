// server/autoOrganize/heuristics2.js (ESM)

const FIELD_WEIGHTS = { title: 3.0, desc: 1.6, url: 0.6 };
const BASELINE = 0;
const MIN_MARGIN = 0.35; // Lowered from 0.5 for better classification

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
  return new RegExp(`(?:${parts.join('|')})`, 'gi'); // NOTE: 'g' added
}

const CATS = [
  {
    label: "Health & Medicine",
    include: buildPattern([
      "doctor", "dr\\.?\\s", "md\\b", "physician", "medicine", "medical", "endocrin*", "cardio*", "metabol*", "physiology*",
      "neuro", "sleep", "nutrition", "diet", "fasting", "cholesterol", "insulin", "glucose", "exercise physiology"
    ]),
    exclude: buildPattern([
      // avoid music producer "Doctor Mix", "Dr. Dre", etc.
      "doctor mix", "dr\\.?\\s?dre", "doctor who", "drum", "dj\\b"
    ]),
  },
  {
    label: "AI & Emerging Tech",
    include: buildPattern([
      "ai", "artificial intelligence", "gpt", "chatgpt", "llm", "deep learning",
      "machine learning", "ml\\b", "generative", "midjourney", "stable diffusion", "prompt",
      "karpathy", "openai", "anthropic", "llama", "mistral"
    ]),
    exclude: buildPattern(["makeup ai", "ai art nails"]), // examples of lifestyle overlaps
  },
  {
    label: "General Tech & Reviews",
    include: buildPattern([
      "tech", "review", "unboxing", "gadgets?", "apple", "iphone", "ipad", "mac",
      "android", "windows", "pc build", "benchmark"
    ]),
    exclude: buildPattern(["photography", "camera", "drone", "flight sim"]),
  },
  {
    label: "Photography & Cameras",
    include: buildPattern([
      "camera", "photograph", "lens", "sony", "canon", "nikon", "fujifilm",
      "lightroom", "photoshop", "mirrorless", "brandon li", "allan walls",
      "gimbal", "cinewhoop", "b-roll"
    ]),
    exclude: buildPattern(["security camera", "body cam", "dashcam", "marketing", "dropship", "ecom", "crypto", "stocks"]),
  },
  {
    label: "Video Editing & Creative Tools",
    include: buildPattern([
      "edit", "premiere", "final cut", "davinci resolve", "after effects",
      "motionvfx", "filmora", "bretfx", "color grade", "timeline",
      "3dvista", "virtual tour", "360", "vr", "fusion", "motion"
    ]),
    exclude: buildPattern(["sales", "agency", "dropship"]),
  },
  {
    label: "Business & Marketing",
    include: buildPattern([
      "marketing", "ads", "adwords", "funnels", "funnel", "sales", "saas",
      "ecommerce", "brand", "branding", "agency", "entrepreneur", "entrepreneurship",
      "startup", "shopify", "amazon fba"
    ]),
    exclude: buildPattern([
      "flight", "storm", "camera", "lens", "photo", "premiere", "filmora",
      "davinci", "final cut", "garden", "seed", "compost", "orchestra",
      "guitar", "mix", "piano", "trailer", "trailers", "clip", "clips",
      "cinema", "movie", "film", "entertainment"
    ]),
  },
  {
    label: "Music & Musicians",
    include: buildPattern([
      "guitar", "bass", "drums", "piano", "vocal", "singer", "songwriter",
      "mix", "master", "daw", "ableton", "logic pro", "pro tools", "pedal",
      "riff", "chord", "jazz", "concert", "symphony", "orchestra", "classical",
      "arte", "live music", "musician", "band", "album", "song", "music video"
    ]),
    exclude: buildPattern(["storm", "flight", "pilot", "camera", "lens"]),
  },
  {
    label: "DIY, Home & Construction",
    include: buildPattern(["diy", "home", "renovation", "woodworking", "craftsman", "garage", "concrete", "builder"]),
    exclude: buildPattern([]),
  },

  {
    label: "Weather & Storms",
    include: buildPattern([
      "storm", "tornado", "tornadoes", "hurricane", "hurricanes", "hail", "severe", "severe weather",
      "forecast", "radar", "meteorolog*", "meteorologist", "storm chaser", "storm chasing", "chaser",
      "noaa", "nws", "supercell", "twister", "winter storm", "ryan hall", "reed timmer",
      "live storms media", "weather", "wx", "mesoscale", "outflow", "funnel cloud"
    ]),
    exclude: buildPattern([]),
  },
  {
    label: "Aviation & Flight",
    include: buildPattern([
      "pilot", "aviation", "airliner", "jet", "cockpit", "atc", "boeing",
      "airbus", "737", "a320", "sim", "simulator", "flight sim", "mentour",
      "airline", "flight", "icao", "ifr", "vfr", "checkride", "aircrash", "atpl"
    ]),
    exclude: buildPattern([]),
  },
  {
    label: "Gardening & Outdoors",
    include: buildPattern([
      "garden", "gardening", "homestead", "homesteading", "compost", "mulch",
      "seed", "seedling", "raised bed", "orchard", "pruning", "lawn", "landscape", "landscaping",
      "organic food", "grow food"
    ]),
    exclude: buildPattern([]),
  },
  {
    label: "News & Commentary",
    include: buildPattern([
      "news", "breaking", "report", "analysis", "commentary", "opinion",
      "politics", "geopolitics", "world", "international", "global",
      "dw news", "cna", "bbc", "journalism", "correspondents"
    ]),
    exclude: buildPattern([]),
  },
  {
    label: "Trains & Rail",
    include: buildPattern([
      "train", "railway", "railroad", "locomotive", "railfan", "railfanning",
      "freight", "passenger train", "rail", "track", "station", "depot",
      "amtrak", "csx", "bnsf", "union pacific", "norfolk southern",
      "railway", "railroads", "trainspotting", "model train", "toy train"
    ]),
    exclude: buildPattern(["running", "fitness", "exercise"]),
  },
  {
    label: "Travel & Vlogs",
    include: buildPattern([
      "travel", "vlog", "trip", "vacation", "holiday", "adventure",
      "backpacking", "road trip", "wanderlust", "nomad", "expat",
      "passport", "visa", "culture", "explore", "destination"
    ]),
    exclude: buildPattern(["storm", "weather", "news"]),
  },
  {
    label: "Film/Trailers & Entertainment",
    include: buildPattern([
      "movie", "film", "cinema", "trailer", "hollywood", "bollywood",
      "netflix", "disney", "marvel", "dc", "pixar", "animation",
      "actor", "actress", "director", "producer", "screenplay",
      "clips", "4k", "hd", "entertainment", "show", "series", "episode"
    ]),
    exclude: buildPattern(["music video", "concert", "live performance"]),
  },
  {
    label: "Pools/Home Services",
    include: buildPattern([
      "pool", "swimming pool", "spa", "hot tub", "plumbing", "hvac",
      "electrician", "contractor", "renovation", "repair", "maintenance",
      "cleaning service", "landscaping", "pest control", "home service"
    ]),
    exclude: buildPattern(["swimming", "fitness", "exercise"]),
  },
  {
    label: "Architecture & Design",
    include: buildPattern([
      "architect", "architecture", "design", "interior design", "building",
      "structure", "blueprint", "cad", "sketchup", "revit", "3d model",
      "urban planning", "landscape architecture", "sustainable design"
    ]),
    exclude: buildPattern(["fashion", "graphic design", "web design"]),
  },
  {
    label: "Programming & Tutorials",
    include: buildPattern([
      "programming", "coding", "tutorial", "javascript", "python", "java",
      "c++", "react", "node.js", "api", "database", "algorithm",
      "data structure", "web development", "software engineering"
    ]),
    exclude: buildPattern(["music production", "video editing"]),
  },
  {
    label: "Podcasts & Long-form",
    include: buildPattern([
      "podcast", "interview", "conversation", "discussion", "deep dive",
      "long-form", "episode", "season", "host", "guest", "dialogue",
      "monologue", "narrative", "storytelling", "documentary"
    ]),
    exclude: buildPattern(["music", "song", "album"]),
  },
  {
    label: "Cybersecurity",
    include: buildPattern([
      "cybersecurity", "cyber security", "hacking", "pentest", "penetration testing",
      "vulnerability", "malware", "virus", "firewall", "encryption",
      "cyber attack", "data breach", "privacy", "security audit"
    ]),
    exclude: buildPattern(["ethical hacking", "white hat"]),
  },
  {
    label: "Finance & Investing",
    include: buildPattern([
      "finance", "investing", "stock", "crypto", "cryptocurrency", "bitcoin",
      "trading", "portfolio", "dividend", "etf", "mutual fund",
      "real estate", "retirement", "wealth management", "financial planning"
    ]),
    exclude: buildPattern(["crypto art", "nft"]),
  },
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

  // Apply title-contains-label keyword bump (+0.75) before tie-break
  if (best.score > BASELINE) {
    let bestIndex = -1;
    for (let i = 0; i < CATS.length; i++) {
      const cat = CATS[i];
      const label = LABEL_ALIASES[cat.label] || cat.label;
      if (label === best.label) {
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
