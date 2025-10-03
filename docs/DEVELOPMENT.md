# Development Guide: YT Digest

## Local Setup

### Prerequisites
- **Node.js** 18+ and npm
- **YouTube Data API v3** credentials (Google Cloud Console)
- **OAuth 2.0** client ID for YouTube access

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd yt-digest
   npm install
   cd server && npm install && cd ..
   ```

2. **Configure environment**:
   ```bash
   # Copy and edit server configuration
   cp server/.env.example server/.env
   ```

3. **Set up YouTube API**:
   - Create project in [Google Cloud Console](https://console.cloud.google.com/)
   - Enable YouTube Data API v3
   - Create OAuth 2.0 credentials
   - Add redirect URI: `http://localhost:3000/auth/google/callback`
   - Copy credentials to `server/.env`

### Environment Variables

#### Required (`server/.env`)
```env
# YouTube API Configuration
GOOGLE_CLIENT_ID=your_client_id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
YOUTUBE_API_KEY=your_api_key

# Server Configuration
PORT=3000
NODE_ENV=development

# Data Directory (optional - auto-detected if not set)
DATA_DIR=/absolute/path/to/repo/data
REPO_ROOT=/absolute/path/to/repo
```

#### Optional Overrides
- `DATA_DIR`: Absolute path to data directory (preferred)
- `REPO_ROOT`: Fallback repo root path if auto-detection fails

## Running the Application

### Development Mode
```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
npm run dev
```

### Production Mode
```bash
# Build frontend
npm run build

# Start server (serves both API and static files)
cd server && npm start
```

## Debug & Development Tools

### Auto Organize Debug Mode

#### Enable Debug Introspection
```bash
# Add debug parameter to see scoring details
curl "http://localhost:3000/api/auto-organize?debug=1"
```

#### Force Debug Export
```bash
# Write debug data to file without API call
curl -X POST http://localhost:3000/api/auto-organize/debug/export
```

#### Debug File Contents
The `data/autoOrganize.debug.json` file contains:
- `rows`: Array of channel classification results
- `clusters`: Generated cluster structure
- Each row includes: `id`, `title`, `url`, `label`, `why` (mode, best, runner, scores)

### Validation Commands

#### Test Auto Organize Health
```bash
# Recompute cache → writes data/autoOrganize.json
curl -s -X POST http://localhost:3000/api/auto-organize/recompute | jq

# Check cluster count
curl -s http://localhost:3000/api/auto-organize | jq '.clusters | length'

# Produce debug rows & check file is non-empty
curl -s "http://localhost:3000/api/auto-organize?debug=1" | jq '.debug'
node -e "const fs=require('fs'); console.log(fs.statSync('data/autoOrganize.debug.json').size > 1000 ? 'OK' : 'Too small')"

# Spot-check a channel by title (example: Eckberg)
curl -s "http://localhost:3000/api/auto-organize?debug=1" \
  | jq '..|objects|select(has("title"))|select(.title|test("Eckberg";"i"))'
```

#### Expected Results
- `clusters > 0`: Auto organize is generating clusters
- `debug.rows ≈ 503`: Processing expected number of channels
- `debug file size > 1KB`: Debug data is being written
- Channel lookup returns scoring details with `why.scores`

### Manual Overrides

#### Using Override File
Edit `data/autoOrganize.overrides.json`:
```json
{
  "CHANNEL_ID_HERE": "Custom Category Name"
}
```

#### Apply Overrides
```bash
# Recompute to apply manual overrides
curl -X POST http://localhost:3000/api/auto-organize/recompute
```

### Path Resolution

#### Auto-Detection
The system automatically finds the repo root by looking for:
- `package.json` in current or parent directories
- `data/` directory alongside `package.json`

#### Manual Override
Set `DATA_DIR` environment variable:
```bash
DATA_DIR=/custom/path/to/data npm run dev
```

#### Docker Deployment
For containerized deployments:
```bash
docker run -e DATA_DIR=/app/data your-image
```

## Troubleshooting

### Common Issues

#### Path Resolution Fails
- Ensure `package.json` exists in repo root
- Check that `data/` directory is at repo root level
- Use `DATA_DIR` environment variable for custom paths

#### YouTube API Quota Exceeded
- Monitor usage in Google Cloud Console
- Implement caching for video metadata
- Use pagination for large subscription lists

#### Debug File Not Generated
- Check file permissions in `data/` directory
- Verify server has write access to data path
- Use POST endpoint to force debug export

### Logs and Monitoring

#### Server Logs
```bash
# Watch server logs in real-time
cd server && npm run dev
```

#### API Response Inspection
```bash
# Pretty-print API responses
curl -s http://localhost:3000/api/auto-organize | jq
```

## Testing

### Manual Validation Steps
1. **OAuth Flow**: Complete YouTube authorization
2. **Subscription Fetch**: Verify subscriptions load in Channel Picker
3. **Auto Organize**: Check clusters generate correctly
4. **Manual Overrides**: Test category corrections
5. **Debug Export**: Verify debug files contain expected data

### Health Checks
- API endpoints return 200 status codes
- Auto organize generates clusters from real data
- Debug mode provides scoring introspection
- Manual overrides apply correctly after recompute
