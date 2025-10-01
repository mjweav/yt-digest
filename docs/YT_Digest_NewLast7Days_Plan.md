# YT Digest – Plan for "New in Last 7 Days"

## Context
The current implementation in Channel Picker uses `subscriptions.list contentDetails.newItemCount` to display "new this week."  
This field is **not reliable** — it reflects YouTube's internal unread count, not true uploads in the last 7 days.  
In practice, it shows only `0` or `1` and does not represent actual channel activity.

## Analysis of Options

### 1. Channel Picker Stage (Subscriptions)
- **Data available:** only `totalItemCount` and `newItemCount` from `subscriptions.list`.
- **Accurate count of new uploads requires `playlistItems.list`.**
- For 503 subscriptions, this means ~500 API calls (≈ 5–6% of daily quota).
- ❌ Too expensive to run at every subscription sync.

### 2. Digest Stage (Video Fetch)
- **Data available:** already fetches `playlistItems.list` + `videos.list` for each selected channel.
- Each video has `publishedAt`, so we can count how many were published in the last 7 days.
- ✅ Essentially free, since we’re already pulling this data.
- ✅ Scoped only to selected channels, not all subscriptions.

### 3. Hybrid Approach
- After a digest run, persist computed `newLast7Days` into `channels.json` for selected channels.
- Channel Picker can display this number, but it will reflect **last digest run**, not live activity.
- ❌ Could confuse users if stale.

## Recommendation
- **Remove "new this week" from Channel Picker.**
- **Add "New in Last 7 Days" as part of Digest card enrichment.**

## Implementation Plan

### Channel Picker Changes
- Remove use of `contentDetails.newItemCount`.
- Keep metadata light: avatar + title (clickable), total videos, since YYYY, tags, description expand/collapse.

### Digest Changes (Future Phase)
- During `/api/youtube/videos` fetch:
  - Count per-channel uploads with `publishedAt >= now - 7d`.
  - Add field `newLast7Days` to each digest entry.
- Update Digest cards to display:
  - Badge: “(X) New in Last 7 Days” (always show, even `0`).
  - Optionally highlight channels with high activity.

### Optional Server Update
- Extend `/api/youtube/videos` response to include `newLast7Days` per channel.
- Persist into `digests.json`.

### Success Criteria
- Channel Picker no longer shows misleading “new this week.”
- Digest page shows accurate per-channel activity with no extra API cost.
- API quota usage remains essentially unchanged.
- Users see a clear separation:
  - Channel Picker = organization.
  - Digest = activity & consumption.

---
