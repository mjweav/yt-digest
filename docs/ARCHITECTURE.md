# Architecture: YT Digest

## Overview
YT Digest is a full-stack web application that helps users organize YouTube subscriptions into curated digests. It uses local JSON storage with plans for PostgreSQL migration.

## Backend Architecture

### Server Structure (`server/`)
- **Express.js** application with modular routes
- **Local JSON persistence** in `/data` directory
- **YouTube Data API v3** integration with quota management
- **OAuth 2.0** flow for YouTube account access

### Data & Paths
- **Path Resolution**: `server/utils/paths.js` discovers repo root and data directory
- **Environment Variables**:
  - `DATA_DIR`: Preferred absolute path to data directory
  - `REPO_ROOT`: Fallback repo root path
- **Data Files**:
  - `channels.json` — subscription metadata
  - `categories.json` — user-defined categories
  - `channelCategories.json` — channel-to-category assignments
  - `autoOrganize.json` — generated clusters
  - `autoOrganize.debug.json` — debug introspection data
  - `autoOrganize.overrides.json` — manual cluster overrides

### Auto Organize Pipeline
1. **Classification**: `heuristics2.js` scores channels using weighted keywords
2. **Overrides**: Manual corrections applied from `autoOrganize.overrides.json`
3. **Clustering**: `builder.js` groups channels into visual clusters
4. **Hydration**: Categories merged from assignments store

## Frontend Architecture

### Technology Stack
- **React 18** with hooks-based state management
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **TypeScript definitions** for API contracts

### Core Components
- **Channel Picker** (`src/pages/ChannelPicker.jsx`): Organize subscriptions
- **Auto Organize** (`src/pages/AutoOrganize.jsx`): AI-powered categorization
- **Digest** (`src/pages/Digest.jsx`): Netflix-style video browsing
- **Settings** (`src/pages/Settings.jsx`): OAuth and preferences

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/auth/status` | Check OAuth connection |
| POST | `/api/auth/disconnect` | Clear OAuth tokens |
| GET | `/api/subscriptions` | Fetch user subscriptions |
| GET | `/api/categories` | List user categories |
| POST | `/api/categories` | Create new category |
| POST | `/api/categories/bulk-assign` | Assign channels to category |
| GET | `/api/auto-organize` | Return clusters with categories |
| GET | `/api/auto-organize?debug=1` | Debug mode with introspection |
| POST | `/api/auto-organize/recompute` | Rebuild clusters |
| POST | `/api/auto-organize/debug/export` | Force debug export |

## Data Flow

### Auto Organization Process
1. **Input**: Channel metadata (title, description, URL)
2. **Classification**: Weighted scoring against keyword sets
3. **Overrides**: Manual corrections applied
4. **Clustering**: Channels grouped by similarity
5. **Output**: Visual clusters with size-based styling

### Persistence Strategy
- **Immediate**: All changes save to JSON files
- **Atomic**: Write operations use temporary files
- **Recovery**: Failed writes leave original files intact

## Future Optimizations
- **Database Migration**: PostgreSQL with Prisma ORM
- **Incremental Updates**: Smart caching for video metadata
- **Theme System**: Dark/light mode toggle
- **Performance**: CDN optimization for thumbnails
