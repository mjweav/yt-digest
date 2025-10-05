# CHANGELOG

All notable changes to YT Digest will be documented here.

## Phase 1 – Project Setup
- JSON storage utility created (`jsonStore.js`)
- Express API with CRUD endpoints
- React frontend initialized with Vite + Tailwind

## Phase 2 – Channel Picker
- Basic channel picker page scaffolded
- Display subscriptions (mock data initially)

## Phase 3 – Google OAuth
- Integrated YouTube OAuth flow
- Stored tokens in `users.json`
- Fetched real subscriptions

## Phase 4 – Channel Selection
- Added multi-select channel assignment
- Persist selections for digest generation

## Phase 5 – Inline Tag Assignment
- Tags displayed inline on channel cards
- One tag per channel, with `+Tag` option

## Phase 6 – Subscriptions Paging
- Implemented paged fetching for >500 subscriptions
- Handles real-world scale of 503 subs

## Phase 7 – OAuth Settings Page
- Dedicated settings page for auth management
- Endpoints: `/api/auth/status`, `/api/auth/disconnect`

## Phase 8 – Alpha Navigation (Horizontal)
- Initial horizontal nav rail implemented (later deprecated)

## Phase 9 – Alpha Navigation (Vertical)
- Vertical alphabet navigation implemented
- Mobile vs desktop styles supported

## Phase 10 – Digest Page
- Digest view with Netflix-style rails
- Pulls latest videos from selected channels
- Watch tracking implemented

## Phase 11 – Video Fetching
- Integrated YouTube playlist + videos API
- Caching added (`digests.json`)

## Phase 12 – Dark Mode
- Global dark mode with toggle in header
- Themed cards for picker, digest, and settings

## Phase 13 – Enriched Channel Picker
- Channel cards enhanced with:
  - Clickable avatar/title → channel URL
  - Metadata badges (total videos, new videos, published date)
  - Expand/collapse descriptions
  - Inline tags row preserved
- Added filters: empty categories, recent videos
- Fixed displaced checkbox position

## Phase 14 – Immediate Autosave
- Channel selections now save automatically on toggle
- Optimistic UI updates for instant feedback
- Comprehensive error handling with state reversion
- Manual sync button repurposed as fallback option
- Enhanced user experience with real-time persistence

## Phase 15 – Categories & Smart Image Loading
- Categories API with stub implementation for drop-up menu
- Category assignment with bulk operations and custom category creation
- Smart image loading with concurrency cap (12 concurrent requests)
- Avatar component with intersection observer and error fallbacks
- Eager loading for first screenful (32 items per cluster)
- No server proxy - direct CDN URLs maintained

## Microstep 1.7b – Category assign works + drop-up closes + avatar size tuned
- **Category assignment**: Fixed "Add to Category" functionality with robust POST handler, proper error handling, and validation for selected channel IDs
- **Drop-up UX**: Added proper state management with refs, closes on Esc key and click-outside, maintains selection state across interactions
- **Avatar optimization**: Reduced avatar sizes (xs:48px, sm:64px, md:80px, lg:96px) and softened size thresholds (p25/p55/p80) for less overlap and better visual hierarchy

## Microstep 1.7 – Avatar retry sweep + category UX fix + more size variance
- **Avatar retry sweep**: Added retry manager for failed CDN thumbnails with backoff (up to 2 retries), post-load sweep runs 3s after mount and on scroll end
- **Categories UX fix**: Newly created categories now appear immediately in drop-up menu without requiring page reload
- **Size variance improvement**: Changed from quartiles to p15/p50/p85 percentiles for more visual spread in avatar sizes (more lg contrast, smaller xs)

## Microstep 1.9 – Real categories, real assignment, clear UI state, sticky header
- **Server**: Real categories with persistent storage via categoriesStore.js, auto-seeding from existing channel data, JSON persistence for categories and assignments
- **Frontend**: Live categories list refresh, optimistic UI updates for assignments, strong visual indicators (emerald ring + centered check overlay) for assigned channels
- **UI**: Sticky header that pins controls while clusters scroll underneath, proper content padding to prevent overlap
- **Persistence**: Categories and channel assignments persist across server restarts, bulk assignment with proper validation and error handling

## Microstep 1.9a – Hydrate "assigned" on initial load
- **Server**: Enhanced /api/auto-organize to merge per-channel categories from assignments store, added cats field to AOChannel type definition
- **Frontend**: Derive assigned state from server response on first paint, build assigned Map from channel.cats array for immediate UI hydration
- **Integration**: Categories assigned in previous sessions now show visual indicators immediately on page load without requiring user interaction

## [Unreleased] — Auto Organize: heuristics v2, debug, overrides, and path fix
- Added weighted scoring classifier with negatives and tie margin.
- Introduced manual overrides via `data/autoOrganize.overrides.json`.
- Added debug export: `GET /api/auto-organize?debug=1` writes `data/autoOrganize.debug.json`.
- Hardened path resolver to correctly target repo `data/` (supports `DATA_DIR` override).
- Normalized builder to always return `{ clusters, debugRows }` and hydrate categories.
- Validation commands added to docs.

## Microstep 2.1 — LWLL v3: Heuristics + TF-IDF fallback + better debug
- **Enhanced heuristics**: Added 9 new categories (Trains & Rail, Travel & Vlogs, Film/Trailers & Entertainment, Pools/Home Services, Architecture & Design, Programming & Tutorials, Podcasts & Long-form, Cybersecurity, Finance & Investing) with focused tokens and phrases
- **Title keyword boost**: Added +0.75 score bump when chosen category's include pattern hits title, before tie-break logic
- **Lowered threshold**: Reduced MIN_MARGIN from 0.5 to 0.35 for better classification coverage
- **TF-IDF fallback**: Implemented lightweight "like-with-like" system using cosine similarity for low-confidence classifications (≥3 votes, ≥0.15 similarity threshold)
- **Enhanced debugging**: Updated debug output with method indicators ("heuristic", "tfidf", "override"), category counts, and compact debug file structure
- **Performance**: TF-IDF vectors built in memory only, no disk persistence, using pure JavaScript implementation
- **Results**: Achieved 20.1% Unclassified rate (101/503) - well below 25% target, with TF-IDF fallback successfully classifying 87 additional channels
