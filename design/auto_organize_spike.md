# Auto Organize Spike — Implementation Brief

## Goal
Add an “Auto Organize” view to the Channel Picker that clusters subscriptions by theme and shows a dense, bubble-style layout to enable fast multi-select + “Add to Category”.

## References
- Visual spec: design/auto_organize_collage_v4_1.html
- Screenshot: design/auto_organize_collage_v4_1.jpeg

## Backend (Node/Express)

### Endpoints
**GET /api/auto-organize**  
Returns cached clusters; builds if missing or stale.  
Response shape: `AOResponse` (see `server/types.d.ts`).

**POST /api/auto-organize/recompute**  
Rebuilds clusters now (heuristics first; embeddings/AI behind flags).

**POST /api/categories/bulk-assign**  
Body: `{ "channelIds": string[], "category": string }`  
Appends category to user’s categories for the listed channels.

### Builder pipeline
1. Normalize each channel: `{id, title, desc, thumb, videoCount}`
2. Heuristic assignment using regex (see `server/autoOrganize/heuristics.js`).
3. Size bubbles by videoCount quartiles.
4. Tile span by cluster size: `>=70 → 4`, `>=50 → 3`, `>=30 → 2`, else `1`.
5. Labeling:
   - Default: fixed labels from heuristics.
   - Optional: TF-IDF keywords (no API).
   - Optional AI labeling (flag `USE_AI_LABELS=true`).
6. Cache to `/data/autoOrganize.json` `{ builtAt, clusters[] }`

### Flags (.env)
```
USE_EMBEDDINGS=false
USE_AI_LABELS=false
OPENAI_API_KEY=   # only if USE_* flags are enabled
```

### Files to create
- `server/autoOrganize/builder.js`
- `server/autoOrganize/heuristics.js`
- `server/routes/autoOrganize.js`
- `server/types.d.ts` (AOChannel, AOCluster, AOResponse)

## Frontend (React + Tailwind)
- New page: `src/pages/AutoOrganize.jsx`
- Fetch `GET /api/auto-organize` on mount.
- Render cluster tiles:
  - container spans: `span-1..span-4` (responsive grid, 4 columns)
  - bubble sizes: `xs/sm/md/lg`
  - tooltip on hover: title + description + video count
  - kebab per cluster: Select all / Deselect all / Add all / Hide
- Sticky **drop-up** bar:
  - shows “N selected”, “Add to Category ▾”, “Clear”
  - calls `POST /api/categories/bulk-assign`
- Header:
  - “Auto Organize” toggle (active), “Classic Picker” toggle (nav to old page)
  - Search (filters by cluster label or channel name)
  - “Show hidden (n)” chip to restore hidden clusters
  - Recompute → `POST /api/auto-organize/recompute` → refetch

## Acceptance criteria
- Page loads clusters in ≤2s using cached JSON with 500+ channels.
- Multi-select + bulk assign works; confirmation toast appears.
- Hide cluster + “Show hidden” works without reload.
- Recompute round-trips to server and refreshes UI.
- No OpenAI calls unless flags enabled.

## Nice-to-haves (not required for spike)
- AI labeling of ambiguous buckets (1 call per cluster).
- Embeddings fallback for “General/Mixed” via local or OpenAI embeddings.
- Persist hidden cluster IDs per user.

---

**Branch guidance**  
Use a short-lived feature branch: `spike/auto-organize` → squash-merge when done.
