# PRD: YT Digest (Subscription Curator) Spike

## Objective
Create an application to curate and organize YouTube subscriptions into personalized digests.  
The MVP will allow users to connect their YouTube account, select subscriptions of interest, organize them by tags (categories), and generate a digest page showing the latest videos grouped by those tags.

The goal is to provide a clean, organized way to consume content from many subscriptions (e.g., 500+ channels), overcoming YouTube’s limited subscription management features.

---

## Architecture Overview

### Backend (Node.js + Express)
- Local JSON storage in `/data` folder (channels.json, tags.json, selections.json, watched.json, digests.json, users.json).
- Express routes for authentication, subscriptions, videos, tags, and watched tracking.
- Google OAuth for YouTube Data API access (tokens stored/managed locally).
- Uses YouTube Data API (`subscriptions.list`, `playlistItems.list`, `videos.list`).

### Frontend (React + Vite + Tailwind)
- Two main pages: Channel Picker and Digest Page.
- Settings page for OAuth management.
- Responsive design with Netflix-style rails for video display.

### Data Storage
- **channels.json** → list of subscriptions with metadata.
- **tags.json** → list of user-defined tags (categories).
- **selections.json** → mapping of channelId → tagId + selected flag.
- **watched.json** → tracks watched videos by videoId.
- **digests.json** → stores generated digests (with timestamp and included videos).
- **users.json** → stores OAuth tokens for Google account(s).

---

## Success Criteria (MVP)
1. User can authenticate via Google OAuth once, tokens persist and auto-refresh.
2. User sees all subscriptions, can assign them to tags.
3. Digest page fetches videos for tagged subscriptions within a date range.
4. Digest displays videos in Netflix-style rails grouped by tag.
5. Watch tracking persists locally and updates UI.
6. Efficient use of YouTube API quota (10,000 units/day).

---

# Phase Updates

## Phase 3: Video Fetching & Digest Generation
- Implemented backend `/api/youtube/videos` endpoint.
- Fetches videos from subscriptions based on tags and date range.
- Normalizes video data (title, description, thumbnail, views, duration, etc.).
- Digest page displays videos in rails per tag.
- Videos cached into `digests.json`.

---

## Phase 4: Channel Selection & Digest Filtering
- Channel Picker allows multi-select of channels to include in digest.
- Channels can be assigned to tags.
- Digest filters videos by user’s selected channels + tags.

---

## Phase 5: Inline Tag Assignment (Integrated into Channel Cards)
- Replaced separate categories UI with inline tag chips on each channel card.
- Each channel shows its assigned tag inline, with other available tags shown as small chips.
- Only one tag per channel (exclusive assignment).
- “+Tag” chip allows creation of new tags inline.
- All stored in `tags.json` and `selections.json`.

---

## Phase 6: Subscriptions Paging & Digest Validation
- Handle 500+ subscriptions by paging through `subscriptions.list` (50 per call).
- Ensure backend fetches all pages and merges into `channels.json`.
- Digest validation tests confirm:
  - Non-null digest returns when channels are selected and tagged.
  - API returns consistent video objects with thumbnails and metadata.
  - Error handling gracefully skips failing channels.

---

## Phase 7: OAuth Settings & Token Refresh
- OAuth moved to dedicated Settings page.
- Backend `getAuthorizedClient(userId)` auto-refreshes tokens.
- `/api/auth/status` reports account status; `/api/auth/disconnect` clears tokens.
- Frontend Settings page shows connect/disconnect, redirects if unauthenticated.
- Tokens persist in `users.json`, no need to reconnect each session.

---

## Phase 8: Alpha Jump Navigation (Initial Horizontal Attempt)
- Horizontal A–Z bar added above channel list for jumping by first letter.
- Channels sorted alphabetically.
- Rejected due to poor UX for large lists (500+).

---

## Phase 9: Vertical Alpha Navigation Rail (Final Approach)
- **Desktop**: Vertical A–Z rail pinned right side of channel list.
- **Mobile**: Floating “A–Z” button bottom-right, opens overlay letter grid.
- “#” used for numeric/symbol channels.
- Smooth scroll to first channel matching letter.
- Replaces Phase 8 implementation (horizontal bar removed).

---

# Implementation Guidance for Cline Prompts

When writing prompts for incremental changes:
- Always specify whether to **add**, **update**, or **remove** UI elements/components.  
- If replacing, explicitly say:  
  - “Remove X” then “Add Y.”  
- Example: “Remove the existing horizontal A–Z bar. Add a vertical A–Z rail.”  

This avoids duplicate buttons or elements in the UI.

---

# Future Considerations (Captured in Palette To-Do List)
- Incremental digest caching per channel (`lastFetchedAt` for videos).  
- Quota management & optimization (avoid `search.list` where possible, track API usage).  
- Historical digest snapshots (store daily/weekly digests).  
