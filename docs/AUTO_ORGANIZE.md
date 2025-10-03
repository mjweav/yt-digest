# Auto Organize: Heuristics v2, Overrides & Debug

## Overview
The Auto Organize feature automatically categorizes YouTube channels into logical groups using weighted keyword scoring, with manual override capabilities and comprehensive debug introspection.

## Heuristics v2 (Classification Engine)

### Weighted Scoring System
Located in `server/autoOrganize/heuristics2.js`, the v2 classifier uses:

- **Weighted Fields**:
  - `title`: 3.0x weight (most important)
  - `description`: 1.6x weight (secondary)
  - `url`: 0.6x weight (tertiary)

- **Keyword Categories**:
  - Positive keywords: Boost score for category match
  - Negative keywords: Penalize score for category mismatch
  - Case-insensitive matching with regex support

### Tie Resolution
- **Minimum Margin**: `MIN_MARGIN = 0.75` prevents ambiguous categorization
- **Top-5 Scores**: Returns detailed scoring for debug analysis
- **Fallback Logic**: Channels without clear category matches use intelligent defaults

### Example Scoring
```javascript
// Example channel: "JavaScript Mastery"
const scores = {
  "Programming": 8.5,    // title="JavaScript", desc="coding tutorials"
  "Technology": 3.2,     // desc="tech content"
  "Education": 2.1       // desc="tutorials"
}
// Result: "Programming" (clear winner with margin > 0.75)
```

## Manual Overrides Pipeline

### Override File Structure
File: `data/autoOrganize.overrides.json`
```json
{
  "UC_channel_id_1": "Custom Category Name",
  "UC_channel_id_2": "Another Category"
}
```

### Application Process
1. **Heuristics Run**: Initial classification with v2 scoring
2. **Override Check**: Manual corrections applied per channel
3. **Cluster Building**: Overridden channels use specified categories
4. **Persistence**: No server restart required for changes

### Override Usage
```bash
# Edit override file
echo '{"UC_example_id": "Gaming"}' > data/autoOrganize.overrides.json

# Apply changes
curl -X POST http://localhost:3000/api/auto-organize/recompute
```

## Builder Normalization

### Consistent Output Structure
File: `server/autoOrganize/builder.js`

Always returns:
```javascript
{
  clusters: [...],      // Visual cluster structure
  debugRows: [...]      // Classification details for debug
}
```

### Channel Normalization
- **Required Fields**: `title`, `description`, `url`, `thumbnail`, `videoCount`
- **Category Hydration**: Merges assignments from categories store
- **Size Calculation**: Bubble and span sizing based on video count

### Current Thresholds
- **Bubble Size (avatar)**:
  - `xs`: ≤ 50 videos
  - `sm`: ≤ 400 videos
  - `md`: ≤ 1500 videos
  - `lg`: > 1500 videos

- **Cluster Span (grid width)**:
  - `1`: < 18 channels
  - `2`: ≥ 18 channels
  - `3`: ≥ 45 channels
  - `4`: ≥ 90 channels

## Debug Export & Introspection

### Debug API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/auto-organize` | Return clusters with categories |
| GET | `/api/auto-organize?debug=1` | Include debug data + write file |
| POST | `/api/auto-organize/recompute` | Rebuild clusters from source |
| POST | `/api/auto-organize/debug/export` | Force debug file write |

### Debug File Contents
File: `data/autoOrganize.debug.json`

```javascript
{
  "rows": [
    {
      "id": "UC_channel_id",
      "title": "Channel Name",
      "url": "https://youtube.com/channel/...",
      "label": "Classified Category",
      "why": {
        "mode": "heuristic|override",
        "best": "Top Category",
        "runner": "Second Place",
        "scores": [
          {"category": "Programming", "score": 8.5},
          {"category": "Technology", "score": 3.2}
        ]
      }
    }
  ],
  "clusters": [...]
}
```

### Debug Row Details
- **`mode`**: `"heuristic"` (scored) or `"override"` (manual)
- **`best`**: Highest scoring category
- **`runner`**: Second-highest score
- **`scores`**: Top-5 category scores with weights applied

## Categories Integration

### Persistent Storage
- `data/categories.json`: User-defined category metadata
- `data/channelCategories.json`: Channel-to-category assignments
- Categories included in Auto Organize payload for UI hydration

### Assignment State
- **Server-side**: Categories merged into channel objects
- **Client-side**: `assigned` state derived on first paint
- **Visual Indicators**: Emerald ring + check overlay for assigned channels

## Validation & Quality Assurance

### Health Check Commands
```bash
# 1. Recompute cache → writes data/autoOrganize.json
curl -s -X POST http://localhost:3000/api/auto-organize/recompute | jq

# 2. Check cluster count
curl -s http://localhost:3000/api/auto-organize | jq '.clusters | length'

# 3. Produce debug rows & verify file
curl -s "http://localhost:3000/api/auto-organize?debug=1" | jq '.debug'
node -e "const fs=require('fs'); console.log(fs.statSync('data/autoOrganize.debug.json').size > 1000 ? 'OK' : 'Too small')"

# 4. Spot-check specific channel
curl -s "http://localhost:3000/api/auto-organize?debug=1" \
  | jq '..|objects|select(has("title"))|select(.title|test("Eckberg";"i"))'
```

### Expected Validation Results
- **Clusters**: `> 0` (generating valid clusters)
- **Debug Rows**: `≈ 503` (processing all channels)
- **File Size**: `> 1KB` (debug data present)
- **Channel Lookup**: Returns `why.scores` array

### Manual Testing Workflow
1. **Load Auto Organize page** in browser
2. **Check cluster rendering** (Netflix-style rails)
3. **Enable debug mode** (`?debug=1` in URL)
4. **Inspect scoring** in browser dev tools
5. **Add manual override** for edge cases
6. **Recompute and verify** changes applied

## Usage Notes

### Override Best Practices
- Use for clear categorization errors
- No server restart required
- Changes apply after recompute
- One override per channel ID

### Debug Mode Usage
- **Development**: Understand why channels categorized
- **Tuning**: Analyze scoring before keyword adjustments
- **QA**: Verify classification accuracy
- **Troubleshooting**: Debug categorization issues

### Performance Considerations
- **Quota Management**: Respects 10,000 units/day limit
- **Caching**: Results cached in `autoOrganize.json`
- **Pagination**: Handles large subscription lists
- **File I/O**: Atomic writes with error recovery

## Troubleshooting

### Common Issues

#### No Clusters Generated
- Check debug file for scoring details
- Verify channel data has required fields
- Ensure keyword categories are comprehensive

#### Override Not Applied
- Confirm JSON syntax in override file
- Check channel ID format (UC_ prefix)
- Recompute after making changes

#### Debug File Empty
- Verify server write permissions
- Check data directory path resolution
- Use POST endpoint to force export

### Debug Analysis
1. **Check debug file size** (> 1KB expected)
2. **Inspect `why.scores`** for top signals
3. **Verify `mode` field** (heuristic vs override)
4. **Compare `best` vs `runner`** scores for margin analysis
