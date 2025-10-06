# Unclassified Analysis Findings

Analysis of 334 unclassified channels to guide rule writing.

## Summary
- **Total Unclassified**: 334
- **Unique Tokens**: 3976
- **Top Tokens**: com, channel, https, videos, from, youtube, www, about, business, news
- **Top Bigrams**: https www, youtube channel, check out, youtube com, instagram com

## Ranked Rule Suggestions

### 1. NEWS (86 channels)

**Expected impact**: ~86 channels would move to "news" cluster

**Average confidence score**: 1.7

**Sample channels**:
- After Skool (world)
- AM/PM Podcast (podcast, world, pilot)
- Aus Flight Simmer (news, sim, simulator)
- AV-Ultra (international)
- B&H Photo Video Pro Audio (world)

**Suggested regex patterns** (case-insensitive, literal matches):
```javascript
// Basic patterns - add these to heuristics2.js
"news": rx([
  "news",
  "breaking",
  "report",
  "analysis",
  "commentary",
  "opinion",
  "politics",
  "geopolitics"
])
```

### 2. MUSIC (39 channels)

**Expected impact**: ~39 channels would move to "music" cluster

**Average confidence score**: 1.0

**Sample channels**:
- Alter Bridge (official)
- AM/PM Podcast (podcast, world, pilot)
- Arc De Soleil (official)
- Bob Moses (official)
- CNA (official, news, analysis)

**Suggested regex patterns** (case-insensitive, literal matches):
```javascript
// Basic patterns - add these to heuristics2.js
"music": rx([
  "podcast",
  "official",
  "beats",
  "guitar",
  "bass",
  "drums",
  "piano",
  "vocal"
])
```

### 3. DIY (30 channels)

**Expected impact**: ~30 channels would move to "diy" cluster

**Average confidence score**: 1.2

**Sample channels**:
- Above Ground Pool Builder (builder)
- BRIGHT SIDE (news, world, home)
- CaliKim29 Garden & Home DIY (diy, home, garden)
- Daniella Benita (home)
- Denys Davydov (news, global, home)

**Suggested regex patterns** (case-insensitive, literal matches):
```javascript
// Basic patterns - add these to heuristics2.js
"diy": rx([
  "diy",
  "home",
  "renovation",
  "woodworking",
  "craftsman",
  "garage",
  "concrete",
  "builder"
])
```

### 4. GARDENING (20 channels)

**Expected impact**: ~20 channels would move to "gardening" cluster

**Average confidence score**: 2.0

**Sample channels**:
- Burkland Gardens (garden, lawn, landscaping)
- CaliKim29 Garden & Home DIY (diy, home, garden)
- Clay Hayes (garden, homestead)
- Epic Gardening (gardening)
- Garden Answer (diy, garden)

**Suggested regex patterns** (case-insensitive, literal matches):
```javascript
// Basic patterns - add these to heuristics2.js
"gardening": rx([
  "garden",
  "gardening",
  "homestead",
  "homesteading",
  "compost",
  "mulch",
  "seed",
  "seedling"
])
```

### 5. BUSINESS (16 channels)

**Expected impact**: ~16 channels would move to "business" cluster

**Average confidence score**: 1.4

**Sample channels**:
- BRIGHT SIDE (news, world, home)
- Build Great Products (ai, agency, startup)
- Content Creators (master, brand)
- CopyandContentAI (ai, chatgpt, prompt)
- Institute of Human Anatomy (medical, entrepreneur)

**Suggested regex patterns** (case-insensitive, literal matches):
```javascript
// Basic patterns - add these to heuristics2.js
"business": rx([
  "marketing",
  "ads",
  "adwords",
  "funnels",
  "funnel",
  "sales",
  "saas",
  "ecommerce"
])
```

### 6. TECH (13 channels)

**Expected impact**: ~13 channels would move to "tech" cluster

**Average confidence score**: 1.1

**Sample channels**:
- BRIGHT SIDE (news, world, home)
- Dan Martell (ai, world, tech)
- Jake Sloan (review)
- James Hoffmann (world, home, entrepreneurship)
- Jenn Jager Pro Tutorials (marketing, apple)

**Suggested regex patterns** (case-insensitive, literal matches):
```javascript
// Basic patterns - add these to heuristics2.js
"tech": rx([
  "tech",
  "review",
  "unboxing",
  "gadgets",
  "apple",
  "iphone",
  "ipad",
  "mac"
])
```

### 7. AI (11 channels)

**Expected impact**: ~11 channels would move to "ai" cluster

**Average confidence score**: 1.6

**Sample channels**:
- Build Great Products (ai, agency, startup)
- CopyandContentAI (ai, chatgpt, prompt)
- Dan Martell (ai, world, tech)
- Liam Ottley (ai, saas, agency)
- Matt Gray (ai, brand)

**Suggested regex patterns** (case-insensitive, literal matches):
```javascript
// Basic patterns - add these to heuristics2.js
"ai": rx([
  "ai",
  "artificial intelligence",
  "gpt",
  "chatgpt",
  "llm",
  "deep learning",
  "machine learning",
  "ml"
])
```

### 8. AVIATION (9 channels)

**Expected impact**: ~9 channels would move to "aviation" cluster

**Average confidence score**: 2.1

**Sample channels**:
- 74 Gear (pilot, aviation, boeing)
- AM/PM Podcast (podcast, world, pilot)
- Aus Flight Simmer (news, sim, simulator)
- Blaze Grubbs (pilot, aviation, flight)
- Brian Murray (pilot)

**Suggested regex patterns** (case-insensitive, literal matches):
```javascript
// Basic patterns - add these to heuristics2.js
"aviation": rx([
  "pilot",
  "aviation",
  "airliner",
  "jet",
  "cockpit",
  "atc",
  "boeing",
  "airbus"
])
```

### 9. PHOTOGRAPHY (5 channels)

**Expected impact**: ~5 channels would move to "photography" cluster

**Average confidence score**: 1.0

**Sample channels**:
- KinoCheck.com (sony, news, apple)
- Lester Picker (master, canon)
- Matthew O'Brien (camera, dr)
- On the House - Real Estate Marketing (camera, marketing, sales)
- Peter Lindgren (camera, review)

**Suggested regex patterns** (case-insensitive, literal matches):
```javascript
// Basic patterns - add these to heuristics2.js
"photography": rx([
  "camera",
  "photograph",
  "lens",
  "sony",
  "canon",
  "nikon",
  "fujifilm",
  "lightroom"
])
```

### 10. HEALTH (3 channels)

**Expected impact**: ~3 channels would move to "health" cluster

**Average confidence score**: 1.0

**Sample channels**:
- Institute of Human Anatomy (medical, entrepreneur)
- Matthew O'Brien (camera, dr)
- Next Level Gardening (master, sleep, gardening)

**Suggested regex patterns** (case-insensitive, literal matches):
```javascript
// Basic patterns - add these to heuristics2.js
"health": rx([
  "doctor",
  "dr",
  "md",
  "physician",
  "medicine",
  "medical",
  "cardio",
  "metabolic"
])
```

## Additional Patterns to Consider

### Domain-based Rules
- Domain: "youtube" → Consider cluster-specific rules

### Path-based Rules
- Path: "channel" → May indicate specific content types
- Path: "UCaIalqLU0cYvTrc-3rKms1w" → May indicate specific content types
- Path: "UCBgc_s9bZcC7_VPC7Qyegfw" → May indicate specific content types
- Path: "UCgGpNbEWsZhrtV_62dsUDpQ" → May indicate specific content types
- Path: "UCovVc-qqwYp8oqwO3Sdzx7w" → May indicate specific content types
