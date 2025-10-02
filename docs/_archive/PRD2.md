# PRD: Subscription Curator Spike (Local JSON Storage)

---

## Phase 3: Video Fetching & Digest Generation

### Objective
Enhance the spike to replace demo data on the Digest page with **real YouTube video metadata**, grouped by user-defined tags/categories. Videos should include key details and support watch tracking.

### Features
- **Backend**
  - New endpoint: `GET /api/youtube/videos`
  - Accepts query params: `tagId`, `startDate`, `endDate` (default: last 7 days).
  - For each channel assigned to a tag (from `selections.json`):
    - Fetch channel’s upload playlist (`channels.list` → contentDetails.relatedPlaylists.uploads).
    - Call `playlistItems.list` (maxResults=20) to get video IDs and snippet info.
    - Enrich with `videos.list` (part=snippet,statistics,contentDetails).
    - Filter results by publish date range.
  - Return normalized objects with:
    ```json
    {
      "videoId": "string",
      "channelId": "string",
      "channelTitle": "string",
      "title": "string",
      "description": "string",
      "publishedAt": "ISO8601",
      "thumbnail": "url",
      "viewCount": "number",
      "duration": "ISO8601"
    }
    ```

- **Data Persistence**
  - Cache results in `digests.json` with structure:
    ```json
    {
      "date": "2025-09-30",
      "tagId": "tag1",
      "videos": [ ... ]
    }
    ```

- **Frontend**
  - Digest page fetches videos from `/api/youtube/videos`.
  - Group videos by tag/category.
  - Render Netflix-style rails with video cards showing:
    - Thumbnail
    - Title
    - Channel
    - Published date
    - Views
  - Actions:
    - “Play Video” → opens YouTube in new tab.
    - “Mark Watched” → logs to `watched.json`.

- **Refresh Control**
  - “Regenerate Digest” button clears cached digest and refetches fresh videos.

- **Watched State**
  - On render, overlay ✓ Watched badge if `videoId` exists in `watched.json`.

### Success Criteria
- Digest page shows real videos grouped by categories.
- Watch state persists across sessions.
- Refresh regenerates digest with up-to-date content.

### Out of Scope (for this phase)
- AI filtering/summaries.
- Playlist auto-creation in YouTube.
- Sharing/export of digests.

---

## Phase 4: Channel Selection & Digest Filtering

### Objective
Allow the user to actively select which subscription channels should be included in the digest, rather than passively listing all subscriptions. Persist selections and ensure the Digest Page only displays videos from chosen channels.

### Features

- **Backend**
  - Extend `/api/selections` routes:
    - `GET /api/selections` → return list of currently selected channelIds.
    - `POST /api/selections` → save selected channelIds to `selections.json`.
  - Data structure:
    ```json
    {
      "selections": [
        { "channelId": "UC12345", "selected": true },
        { "channelId": "UC67890", "selected": false }
      ]
    }
    ```

- **Frontend – Channel Picker**
  - Add checkbox or toggle next to each subscription in the list.
  - Support multi-select of channels.
  - Add “Save Selection” button to persist chosen channels via API.
  - On load, pre-check selections using `GET /api/selections`.
  - Display count of selected channels.

- **Frontend – Digest Page**
  - When calling `/api/youtube/videos`, filter only channels that are selected.
  - If no channels are selected, display message: *“No channels selected. Please choose some in the Channel Picker.”*

- **Persistence**
  - Store user’s selections in `selections.json` alongside tags.
  - Ensure selections persist across server restarts.

- **UI Enhancements**
  - Provide visual feedback (spinner or toast) when saving selections.
  - Keep tag/category system intact and compatible with selections.

### Success Criteria
- User can check/uncheck subscriptions on the Channel Picker page.
- Selections persist across sessions.
- Digest Page only shows videos from selected channels.
- UI clearly reflects which channels are included in the digest.

### Out of Scope (for this phase)
- Handling >50 subscriptions with pagination/batching.
- Multi-user support or sharing selections.
