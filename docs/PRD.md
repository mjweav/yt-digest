# PRD: YT Digest (Subscription Curator)

## Objective
YT Digest helps users curate and organize large YouTube subscription lists into manageable, personalized digests.  
It solves the problem of information overload for users with hundreds of subscriptions by grouping channels into categories and generating Netflix-style digests.

## MVP Success Criteria
1. User connects YouTube account (OAuth) once, tokens persist/refresh.
2. All subscriptions fetched (with paging) and organized into tags (categories).
3. Digest generated showing latest videos grouped by tag.
4. Netflix-style rails for browsing, with thumbnails and metadata.
5. Watch tracking stored locally and visible in UI.
6. Local JSON persistence, scalable to 500+ subscriptions.
7. Efficient API usage under 10,000 units/day.

## Architecture

### Backend (Node.js/Express)
- Local JSON storage in `/data`.
- Routes for auth, subscriptions, videos, tags, watched.
- YouTube Data API integration.

### Frontend (React + Vite + Tailwind)
- Channel Picker: tag/organize subscriptions.
- Digest Page: view curated digests.
- Settings: manage OAuth.

## Data Storage
- `channels.json` — subscriptions metadata
- `tags.json` — categories
- `selections.json` — channel-to-tag mappings
- `watched.json` — watched videos
- `digests.json` — generated digests
- `users.json` — OAuth tokens

## Out of Scope (MVP)
- AI-based categorization
- Social features
- Native mobile app
