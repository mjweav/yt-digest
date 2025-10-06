# YT Digest

YT Digest is a personal YouTube subscription curator. It helps users organize, filter, and explore their YouTube subscriptions more effectively than the native YouTube interface.

## ✅ Current Features
- Google OAuth integration with YouTube Data API
- Channel Picker with tagging and multi-select
- Digest page with Netflix-style video rails
- Watch tracking (mark videos as watched)
- Local JSON storage for data persistence
- Alpha navigation for quick channel jumps
- Dark mode support with toggle button

## 🚧 In Progress
- Theming refactor with Tailwind variables for easier multi-theme support

## 🔮 Planned
- Advanced channel filters (recent uploads, empty categories)
- Digest enrichment with video stats (views, duration, etc.)
- Quota optimization and caching strategies
- AI-assisted categorization and sharing

## 🚀 Getting Started
### Prerequisites
- Node.js v18+
- NPM or Yarn
- YouTube Data API credentials (`client_secret.json`)

### Setup
```bash
# Clone repo
git clone <your-repo-url>
cd yt-digest

# Install dependencies
npm install
```

### Running & Restarting the App

**⚠️ IMPORTANT: Always use the restart script for server management**

We provide a helper script `restart.sh` to simplify starting, stopping, and restarting the servers. **Never run `npm run dev` directly** - use the restart script to prevent multiple instances and ensure proper cleanup.

#### Usage
```bash
./restart.sh [OPTIONS]
```

#### Options
- `-prod` / `--prod` → Start in production mode (build frontend, run backend, serve built app)
- `-backend` → Start only the backend server
- `-frontend` → Start only the frontend server
- `-flush` / `--flush` → Clear npm cache and reinstall dependencies before starting
- `-h` / `--help` → Show help and usage examples

#### Examples
```bash
./restart.sh           # Start both servers in development mode (default)
./restart.sh -prod     # Build frontend and start in production mode
./restart.sh -backend  # Run backend only
./restart.sh -frontend # Run frontend only
./restart.sh -flush    # Clear caches and reinstall before starting
```

#### URLs
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:3001](http://localhost:3001)
- Health check: [http://localhost:3001/api/health](http://localhost:3001/api/health)

This script automatically:
- Stops any existing processes on ports 3000/3001
- Cleans caches if requested
- Restarts services in the chosen mode

## 🗂 Project Structure
```
.
├── _chats/                   # Saved transcripts of Cline task runs
├── data/                     # Local JSON persistence
│   ├── channels.json
│   ├── digests.json
│   ├── selections.json
│   ├── tags.json
│   ├── users.json
│   └── watched.json
├── docs/                     # Documentation (PRD, notes, plans)
│   ├── PRD.md
│   └── YT_Digest_NewLast7Days_Plan.md
├── server/                   # Express backend
│   ├── index.js              # Main server entry
│   ├── routes/               # API route handlers
│   │   ├── auth.js
│   │   └── youtube.js
│   └── utils/                # Helper utilities
│       ├── googleAuth.js
│       └── jsonStore.js
├── src/                      # React frontend (Vite + Tailwind)
│   ├── App.jsx
│   ├── components/           # Shared UI components
│   ├── dist/                 # Built frontend assets
│   ├── index.css
│   ├── index.html
│   ├── main.jsx
│   ├── pages/                # Page-level React components
│   │   ├── ChannelPicker.jsx
│   │   ├── Digest.jsx
│   │   └── Settings.jsx
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── CHANGELOG.md
├── CONTRIBUTING.md
├── README.md
├── ROADMAP.md
├── TODO.md
├── client_secret.json         # OAuth credentials (local only, not committed)
├── package.json
├── package-lock.json
├── restart.sh                 # Helper script for dev/prod startup
└── tree.txt                   # Project structure snapshot
```

## 🔧 Debug & Development Tools

### Auto-Organize Debug Features

The auto-organize system includes comprehensive debugging tools to help diagnose clustering issues and monitor system performance.

#### Debug Endpoints

**GET `/api/auto-organize?debug=1`**
- **Purpose**: Returns enhanced clustering data with detailed debug information
- **URL**: `http://localhost:3001/api/auto-organize?debug=1`
- **Returns**:
  - Standard cluster data with additional debug fields
  - Debug summary with clustering statistics
  - Sample data for troubleshooting
  - Cache information including cluster IDs and build timestamp

**Example Response Structure**:
```json
{
  "builtAt": "2025-10-05T02:12:00.682Z",
  "clusters": [...],
  "debug": {
    "file": "data/autoOrganize.debug.json",
    "summary": {
      "total": 503,
      "byLabel": {
        "Video Editing & Creative Tools": 22,
        "Music & Musicians": 45,
        "Unclassified": 93
      },
      "byMethod": {
        "heuristic": 410,
        "tfidf": 0,
        "override": 0
      },
      "unclassified": 93
    },
    "samples": {
      "unclassified": [...]
    },
    "cache": {
      "clusterCount": 25,
      "clusterIds": ["1310173e", "a570a933", "01e87362"],
      "builtAt": "2025-10-05T02:12:00.682Z"
    }
  }
}
```

**POST `/api/auto-organize/recompute`**
- **Purpose**: Forces recomputation of all clusters and updates cache files
- **URL**: `http://localhost:3001/api/auto-organize/recompute`
- **Method**: POST
- **Returns**: Confirmation with build timestamp and cluster count
- **Side Effects**:
  - Updates `data/autoOrganize.json` with new cluster data
  - Generates `data/autoOrganize.meta.json` with build metadata
  - Maintains backward compatibility with existing cache consumers

**Example Usage**:
```bash
curl -X POST http://localhost:3001/api/auto-organize/recompute
```

**GET `/api/auto-organize/meta`**
- **Purpose**: Returns metadata about the current auto-organize build
- **URL**: `http://localhost:3001/api/auto-organize/meta`
- **Returns**: Build information, parameters, and cluster statistics
- **Returns 404 if**: Meta file doesn't exist (run recompute first)

**Example Response**:
```json
{
  "builtAt": "2025-10-05T02:12:00.682Z",
  "buildVersion": 3,
  "params": {
    "heuristicsVersion": 2,
    "minMargin": 0.35,
    "tfidf": {
      "k": 12,
      "votes": 3,
      "sim": 0.15
    }
  },
  "channelFingerprint": "hash_of_sorted_channel_ids",
  "clusters": {
    "count": 25,
    "idsSample": ["1310173e", "a570a933", "01e87362"]
  }
}
```

**POST `/api/auto-organize/debug/export`**
- **Purpose**: Exports full debug data for detailed analysis
- **URL**: `http://localhost:3001/api/auto-organize/debug/export`
- **Method**: POST
- **Returns**: Confirmation with file location and row count
- **Side Effects**: Writes `data/autoOrganize.debug.json` with complete debug data

#### Debug Information Fields

**Debug Summary (`debug.summary`)**:
- `total`: Total number of processed channels
- `byLabel`: Channel count per cluster label
- `byMethod`: Classification method statistics (heuristic/tfidf/override)
- `unclassified`: Number of channels that couldn't be classified

**Hydration Metrics (`debug.hydration`)**:
- `total`: Total channels processed
- `zeroDesc`: Channels with empty descriptions
- `avgDescLen`: Average description length in characters

**Cache Information (`debug.cache`)**:
- `clusterCount`: Number of generated clusters
- `clusterIds`: Sample of cluster IDs for stability verification
- `builtAt`: Build timestamp for cache invalidation

#### Common Debug Workflows

**1. Check Clustering Quality**:
```bash
curl -s "http://localhost:3001/api/auto-organize?debug=1" | jq '.debug.summary'
```

**2. Verify Cluster Stability**:
```bash
# Save current cluster IDs
curl -s "http://localhost:3001/api/auto-organize?debug=1" | jq '.debug.cache.clusterIds' > /tmp/before.json

# Recompute and compare
curl -X POST http://localhost:3001/api/auto-organize/recompute >/dev/null
curl -s "http://localhost:3001/api/auto-organize?debug=1" | jq '.debug.cache.clusterIds' > /tmp/after.json

diff /tmp/before.json /tmp/after.json || echo "Clusters changed"
```

**3. Analyze Unclassified Channels**:
```bash
curl -s "http://localhost:3001/api/auto-organize?debug=1" | jq '.debug.samples.unclassified'
```

**4. Monitor Build Metadata**:
```bash
curl -s http://localhost:3001/api/auto-organize/meta | jq '.'
```

## 📚 Documentation
- [PRD.md](./docs/PRD.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [TODO.md](./TODO.md)
- [ROADMAP.md](./ROADMAP.md)

## 🛠 Tech Stack
- React + Vite + Tailwind
- Express + Node.js
- Google OAuth + YouTube Data API v3
- Local JSON persistence
