// server/autoOrganize/heuristics2.js (ESM)

const FIELD_WEIGHTS = { title: 3.0, desc: 1.6, url: 0.6 };
const BASELINE = 0;
const MIN_MARGIN = 0.75;

const rx = (parts, flags = "i") =>
  new RegExp(`\\b(?:${parts.map(p => p.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')).join("|")})\\b`, flags);

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
    include: rx(["camera", "photograph", "lens", "sony", "canon", "nikon", "fujifilm", "lightroom", "capture one"]),
    exclude: rx(["security camera", "body cam", "dashcam"]),
  },
  {
    label: "Video Editing & Creative Tools",
    include: rx(["final cut", "premiere", "davinci resolve", "after effects", "motion", "b-roll", "color grading", "audio mix"]),
    exclude: rx(["music theory", "guitar lesson"]),
  },
  {
    label: "Business & Marketing",
    include: rx(["business", "entrepreneur", "marketing", "sales", "funnel", "ecommerce", "agency", "growth", "startup", "brand"]),
    exclude: rx(["music marketing course", "band marketing"]),
  },
  {
    label: "News & Commentary",
    include: rx(["news", "commentary", "politics", "geopolitics", "analysis", "war", "election"]),
    exclude: rx([]),
  },
  {
    label: "Music & Musicians",
    include: rx(["music", "guitar", "vocal", "singer", "producer", "mixing", "jazz", "band", "album", "tour"]),
    exclude: rx(["doctor mix"]), // caught in Health otherwise
  },
  {
    label: "DIY, Home & Construction",
    include: rx(["diy", "home", "renovation", "woodworking", "craftsman", "garage", "concrete", "builder"]),
    exclude: rx([]),
  },
  {
    label: "Aviation & Transport",
    include: rx(["pilot", "boeing", "airbus", "flight", "747", "aviation", "train", "railroad", "locomotive", "transport"]),
    exclude: rx([]),
  },
  {
    label: "Weather & Storms",
    include: rx(["weather", "storm", "tornado", "severe", "hurricane", "radar"]),
    exclude: rx([]),
  },
  {
    label: "Gardening & Outdoors",
    include: rx(["garden", "gardening", "landscape", "pool", "outdoor", "homestead"]),
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

  const chosen =
    best.score > BASELINE && (best.score - runner.score >= MIN_MARGIN)
      ? best.label
      : null;

  return {
    label: chosen,
    scores: perCat.sort((a, b) => b.score - a.score).slice(0, 5),
    best,
    runner,
  };
}
