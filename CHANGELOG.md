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
