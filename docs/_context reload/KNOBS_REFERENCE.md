# Phase 5 Knobs Reference

umbrella_fit.js
- SCORE_MIN (default 0.24 per patch): minimum cosine vs best topic to accept.
- MARGIN_MIN (default 0.10): (top - second) must be at least this.
- TITLE_WEIGHT (default 1.6): multiplies title token influence vs description.
- STOPWORDS / GENERICS: add platform boilerplate terms here.
- Timestamp/number filter: TIME_NUM_RE drops tokens like 10:30, 2024, 12/31, 1080p, 4k, 60fps.

umbrella_topics.json
Keep seeds short and high-signal. Append terms, do not overfit brands.
- AI: + nlp, diffusion, transformers, autonomous, robotics
- Tech: + chip, silicon, gpu, ssd, teardown
- Coding: + backend, frontend, compiler, algorithm, data structures
- News: + bulletin, briefing, nightly, correspondents

Validation heuristics
- Prefer precision: fewer but cleaner assignments.
- Unclassified is acceptable.
- Watch margin distribution: typical good assignments show margin >= 0.08–0.15.
