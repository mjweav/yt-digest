# YT Digest Rules

**Architecture**
- Current persistence: local JSON in `/data`.
- Migration to PostgreSQL + Prisma planned (note in TODO/ROADMAP).
- Maintain separation of backend (`server/`) and frontend (`src/`).

**YouTube API**
- Respect 10,000 unit/day quota.
- Use `subscriptions.list` for channels, `playlistItems.list` + `videos.list` for digests.
- Implement pagination and caching to minimize API costs.

**UI/UX Conventions**
- Channel Picker:
  - Channel icon + title clickable → channel URL.
  - Inline tag assignment (one tag per channel).
  - Expand/collapse description with chevrons.
- Digest Page:
  - Netflix-style horizontal rails.
  - Enriched video cards (title, views, publish date, “watched” tracking).
- Styling: prefer light-gray backgrounds or theme toggle to reduce brightness.

**Server Management**
- Always use `./restart.sh` for starting/restarting servers instead of manual commands.
- Available modes: `dev` (default), `prod`, `backend-only`, `frontend-only`.
- Use `-flush` flag to clear npm cache and reinstall dependencies when needed.
- Never run `npm run dev` or similar commands directly - use the restart script to prevent multiple instances.

**Workflows**
- After each feature, update `CHANGELOG.md`.
- Update `PRD.md` only for architectural/milestone changes.
- Add big-picture items to ROADMAP if not in TODO.

**Future Optimizations (not yet)**
- Incremental caching of videos.
- Theme system (dark/light).
- Migration from JSON → Postgres.
