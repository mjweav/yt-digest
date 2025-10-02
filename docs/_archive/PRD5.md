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

## Phase 10: Complete UI/UX Overhaul & Visual Design Enhancement
- **Color Scheme Transformation**: Migrated from purple/red to sophisticated emerald/blue gradient theme throughout application.
- **Layout Optimization**: Reduced overall layout density by 30-40% for improved readability and modern aesthetic.
- **Netflix-Style Video Rails**: Enhanced video cards with hover effects, optimized aspect ratios, and smooth scrolling.
- **Channel Headers**: Added channel thumbnails, titles, and video counts to each channel section.
- **Glassmorphism Effects**: Implemented modern frosted glass effects for cards and overlays.
- **Responsive Typography**: Improved text hierarchy and spacing for better visual balance.

---

## Phase 11: Advanced State Management & Race Condition Resolution
- **React useEffect Optimization**: Implemented proper dependency management for auto-loading digest data.
- **Race Condition Elimination**: Fixed timing issues where selections loaded after video loading checks.
- **Multiple Solution Approaches**: Tested polling, recursive checking, and simplified manual-load approaches.
- **Final Solution**: Clean useEffect hooks with proper dependencies for reliable auto-loading.
- **State Synchronization**: Ensured selections and digest data load in correct order.

---

## Phase 12: Enhanced Caching & Timestamp Accuracy
- **Cached Timestamp Tracking**: Fixed timestamp display to show actual digest creation time, not page load time.
- **Backend Integration**: Modified frontend to use `cachedAt` timestamp from `/api/digests/latest` response.
- **High-Resolution Timing**: Added 12-hour time format display for precise testing and debugging.
- **Persistent Storage**: Ensured timestamps persist across server restarts and cache regeneration.

---

## Phase 13: Interactive Category Management & UI Controls
- **Expandable/Collapsible Categories**: Added chevron buttons to each category header for space management.
- **Default Expansion State**: Categories default to expanded for immediate content visibility.
- **Smooth Animations**: Implemented CSS transitions for chevron rotation and hover effects.
- **Independent Control**: Each category can be expanded/collapsed separately for personalized organization.

---

## Phase 14: Security & Authentication Improvements
- **OAuth Credentials Security**: Moved from hardcoded credentials to secure `client_secret.json` file reading.
- **Environment-Based Configuration**: Proper credential management for different deployment environments.
- **Token Persistence**: Enhanced OAuth token storage and refresh mechanisms in `users.json`.

---

## Phase 15: Enhanced Debugging, Logging & Validation
- **Comprehensive Debug Logging**: Added detailed console logging throughout digest generation process.
- **API Response Validation**: Enhanced validation for YouTube API responses and error handling.
- **Empty State Management**: Improved handling of edge cases (no channels, no videos, no categories).
- **Development Tools**: Added debugging aids for testing digest loading and caching behavior.

---

## Phase 16: Performance Optimization & Memory Management
- **Efficient Data Structures**: Optimized video data normalization and storage patterns.
- **Reduced Re-renders**: Improved React component lifecycle management to minimize unnecessary updates.
- **API Quota Management**: Enhanced rate limiting and retry logic for YouTube API calls.
- **Memory Cleanup**: Proper state cleanup and effect dependency management.

---

## Phase 17: Advanced Error Handling & User Experience
- **Graceful Degradation**: Application continues functioning even when individual channels fail to load.
- **User-Friendly Messages**: Clear error messages and loading states for better user experience.
- **Retry Mechanisms**: Automatic retry for failed API calls with exponential backoff.
- **Offline Resilience**: Improved handling of network issues and API unavailability.

---

## Phase 18: Final Integration & Production Readiness
- **Complete Feature Integration**: All planned features implemented and tested together.
- **Cross-Browser Compatibility**: Ensured consistent experience across different browsers.
- **Mobile Responsiveness**: Optimized interface for mobile and tablet devices.
- **Performance Benchmarking**: Validated application performance with large subscription lists.

---

## Phase 19: Enriched Channel Picker Cards
- **Clickable Identity**: Avatar images and channel titles both link to channelUrl in new tabs when available.
- **Metadata Badges Row**: Added compact badges showing totalVideos (formatted count), newVideos (only if >0), and "Since YYYY" from publishedAt.
- **Description Expand/Collapse**: Long descriptions (>100 chars) show first 2 lines by default with "▼ More" button; full description accessible via "▲ Less" toggle.
- **Enhanced Visual Design**: Improved card layout with better spacing, hover effects, and consistent styling.
- **Accessibility**: Proper aria-expanded attributes and keyboard navigation support.
- **Performance Optimization**: Uses existing channel data fields, no additional API calls required.

**Data Fields Used:**
- `channelUrl` - For clickable avatar and title links
- `contentDetails.totalItemCount` - Formatted as "X videos" badge
- `contentDetails.newItemCount` - Shows "X new this week" only if >0
- `publishedAt` - Extracts year for "Since YYYY" badge
- `description` - Expandable/collapsible text content

**Success Criteria:**
- Avatar and title both open channelUrl in new tab (when available)
- totalVideos badge renders with properly formatted integers (e.g., "1,245 videos")
- newVideos badge renders only when >0; otherwise hidden
- "Since YYYY" shows correct 4-digit year from publishedAt
- Long descriptions collapse/expand reliably; state isolated per card
- No duplicate UI elements introduced; existing tag assignment preserved

### Diagnostics: New Last 7 Days Debug
**Purpose:** Debug endpoint to validate the accuracy of "new videos this week" counts before UI fixes.

**Endpoint:** `GET /api/youtube/debug/newLast7Days`

**Response Structure:**
```json
{
  "success": true,
  "summary": {
    "totalChannels": 10,
    "channelsWithNewVideos": 3,
    "totalNewVideosLast7Days": 15
  },
  "results": [
    {
      "channelId": "UC...",
      "title": "Channel Name",
      "newLast7Days": 5,
      "sample": [
        {
          "videoId": "dQw4w9WgXcQ",
          "publishedAt": "2024-01-15T10:30:00Z",
          "title": "Video Title"
        }
      ],
      "totalUploadsChecked": 50
    }
  ],
  "debugInfo": {
    "sevenDaysAgo": "2024-01-08T10:14:47.000Z",
    "generatedAt": "2024-01-15T10:14:47.000Z",
    "note": "This endpoint helps validate the accuracy of new video counts displayed in the UI"
  }
}
```

**How to Test:**
1. Ensure user is authenticated with YouTube OAuth
2. Fetch subscriptions to populate `channels.json`
3. Call endpoint: `http://localhost:3001/api/youtube/debug/newLast7Days`
4. Compare `newLast7Days` count with actual uploads in YouTube channel for validation
5. Use `sample` array to verify recent video timestamps and titles

---

# Current Application State

## Fully Implemented Features ✅
- **Complete OAuth 2.0 Integration**: Secure Google account connection with persistent tokens
- **Full Subscription Management**: Handle 500+ subscriptions with pagination and rate limiting
- **Advanced Tag System**: Create, assign, and manage channel categories with inline editing
- **Intelligent Video Digest**: Cached video collection with Netflix-style browsing interface
- **Watch Tracking**: Persistent tracking of watched videos with visual indicators
- **Modern UI/UX**: Emerald/blue gradient theme with glassmorphism effects and responsive design
- **Interactive Controls**: Expandable categories, real-time timestamps, and intuitive navigation
- **Robust Error Handling**: Comprehensive error management and graceful failure recovery
- **Performance Optimized**: Efficient state management and API quota optimization

## Technical Architecture
- **Backend**: Node.js/Express with YouTube Data API v3 integration
- **Frontend**: React 18 + Vite + Tailwind CSS with modern hooks patterns
- **Storage**: Atomic JSON operations with crash-resistant file management
- **Authentication**: Google OAuth 2.0 with secure credential management
- **Caching**: Intelligent digest caching with timestamp tracking

## Data Flow
1. User authenticates via Google OAuth → tokens stored in `users.json`
2. Fetch subscriptions with paging → stored in `channels.json`
3. User assigns channels to tags → stored in `selections.json` and `tags.json`
4. Generate digest from selected channels → cached in `digests.json` with timestamp
5. Display digest in categorized Netflix-style rails → track watched in `watched.json`

---

# Future Considerations (Captured in Palette To-Do List)
- **Advanced Analytics**: Track viewing patterns and suggest content optimization
- **Social Features**: Share digests or collaborate on channel organization
- **Mobile App**: Native iOS/Android applications with offline sync
- **Advanced Filtering**: Date ranges, view counts, channel performance metrics
- **Export Features**: Export digests to RSS, email digests, or other platforms
- **AI-Powered Categorization**: Automatic channel categorization using content analysis
- **Historical Trends**: Track subscription growth and content consumption patterns
