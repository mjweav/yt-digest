# PRD: Subscription Curator Spike (Local JSON Storage)

## 1. Objective
Build a **test harness app** to validate YouTube Data API integration and basic Subscription Curator functionality using **Cline** with local JSON storage.  
This spike should prove the workflow from OAuth → subscription selection → tag/group assignment → digest generation (Netflix-style rails) → watch tracking.

---

## 2. Features

### A) Authentication
- Implement Google OAuth 2.0 using provided client JSON (`client_id`, `client_secret`, redirect_uris`).
- Scopes: `youtube.readonly`.
- On login, store tokens in `data/users.json`.

### B) Subscription Picker Page
- Fetch subscriptions with `subscriptions.list(mine=true)`.
- Display channel list with thumbnail + title.
- Allow user to:
  - Select channels for digest.
  - Create **Tags/Groups** (e.g. “Tech”, “Music”).
  - Assign channels to groups.

### C) Digest Page (v0)
- Global date range filter (default: last 7 days).
- For each Tag/Group:
  - Render a **horizontal rail** (Netflix-style).
  - Video card includes:
    - Thumbnail (hqdefault / maxresdefault fallback).
    - Title, Channel, Published date.
    - Description snippet, View count (from `videos.list`).
  - Actions:
    - **Play Video** → open YouTube in new tab.
    - **Mark Watched** → flag video as watched in `watched.json`.

- Page controls:
  - **Refresh/Regenerate** → re-fetch uploads, rebuild digest.
  - **Back to Channel Picker**.

### D) Watch Tracking
- When user hits “Play Video” → log `videoId` into `data/watched.json` with timestamp.
- Watched videos should display a badge (✓ Watched).

---

## 3. Storage Design (Local JSON)

All files under `/data` folder.

- **users.json**
```json
{ "users": [ { "id": "user1", "googleId": "abc123", "accessToken": "...", "refreshToken": "...", "createdAt": "2025-09-30T10:00:00Z" } ] }
```

- **channels.json**
```json
{ "channels": [ { "id": "UC12345", "title": "Tech Guy", "thumbnail": "https://...", "description": "Latest AI news." } ] }
```

- **tags.json**
```json
{ "tags": [ { "id": "tag1", "name": "AI/Dev" }, { "id": "tag2", "name": "Music" } ] }
```

- **selections.json**
```json
{ "selections": [ { "channelId": "UC12345", "tagId": "tag1" } ] }
```

- **watched.json**
```json
{ "watched": [ { "videoId": "dQw4w9WgXcQ", "userId": "user1", "watchedAt": "2025-09-30T11:00:00Z" } ] }
```

---

## 4. Architecture

### Tech Stack
- **Frontend:** React + Tailwind, Netflix-style rails (e.g., `keen-slider`).
- **Backend:** Node.js + Express (API routes for OAuth, fetch subs, fetch videos).
- **Local Storage:** JSON files in `/data`, CRUD via Node `fs` module or `lowdb`.

### Data Flow
1. User logs in → tokens saved in `users.json`.
2. Fetch subs → store/update in `channels.json`.
3. User tags channels → write to `tags.json` + `selections.json`.
4. Generate digest:
   - Fetch uploads by channel within date range.
   - Enrich with video stats (`videos.list`).
   - Render grouped rails by tag.
5. Track watch events → append to `watched.json`.

---

## 5. Success Criteria
- OAuth works end-to-end.
- Subscription list is fetched and displayed.
- User can create tags/groups and assign channels.
- Digest page renders rails grouped by tags with real data.
- Play button works (opens YouTube).
- Watched state is logged and displayed.
- Refresh button regenerates digest.

---

## 6. Migration Path (Later)
- Replace JSON files with Supabase tables:
  - `users`, `channels`, `tags`, `channel_tags`, `watched`, `digests`.
- Reuse same schema structure for minimal rewrite.
- Add multi-user support, snapshots, billing.

---

## 7. Out of Scope (Spike)
- AI filtering/summaries.
- Playlist creation in YouTube.
- SaaS user management.
- Historical snapshot export.

---

## 8. Deliverables
- `/docs/PRD.md` (this file)
- `/data/*.json` mock files auto-created at runtime if missing.
- React + Node app with two pages:
  1. **Channel Picker**
  2. **Digest Page**
- Working watch-tracking via JSON logs.

---
