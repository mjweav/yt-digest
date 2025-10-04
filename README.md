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
