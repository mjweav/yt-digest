# Cline Primer — Auto Organize Spike for yt-digest

You are working in the **yt-digest** repo. The goal of this spike is to implement the **Auto Organize** view as a new, denser alternative to the Channel Picker that groups channels by theme, supports multi-select, and lets users bulk-assign categories.

## Ground truth & references
- Visual spec: `design/auto_organize_collage_v4_1.html`
- Screenshot: `design/auto_organize_collage_v4_1.jpeg`
- Implementation brief: `design/auto_organize_spike.md`
- Starter server files (on branch):  
  - `server/autoOrganize/builder.js`  
  - `server/autoOrganize/heuristics.js`  
  - `server/routes/autoOrganize.js`  
  - `server/types.d.ts`
- Starter frontend page: `src/pages/AutoOrganize.jsx`
- Channel dataset for dev: `data/channels.json` (503 channels).

**Branch:** `spike/auto-organize` (target `main` in PR; squash-merge).

## Do NOT change
- Existing digest logic, auth flows, or unrelated server routes.
- Any file under `/data/` other than the new cache files you create for this feature.
- Repo configuration (scripts, build tooling) beyond what is required to add these routes/pages.

## Deliverables
1) **Server endpoints**
   - `GET /api/auto-organize`: returns cached clusters or builds on demand.
   - `POST /api/auto-organize/recompute`: forces a rebuild of clusters.
   - `POST /api/categories/bulk-assign`: `{ channelIds: string[], category: string }` → appends category for each channel (follow existing category model; if unknown, create a TODO stub that logs payload and returns 200).
2) **Frontend page** `src/pages/AutoOrganize.jsx`
   - Fetches clusters, renders cluster tiles in a 4-col responsive grid with variable spans (1/2/3/4).
   - Bubble avatars sized by video count quartiles (xs/sm/md/lg); initials fallback if no thumb.
   - Hover tooltip (title/description/video count), select/deselect ring, sticky **drop-up** action bar with “Add to Category ▾” and “Clear”.
   - Per-cluster kebab: Select all / Deselect all / Add all to Category… / Hide cluster. A “Show hidden (n)” chip restores hidden clusters (UI state only for spike).
   - Recompute button → POST → refetch.
3) **Cache** `/data/autoOrganize.json` with `{ builtAt, clusters[] }` per the type shapes below.

## Type shapes (guide)
See `server/types.d.ts`:
```ts
export type AOChannel = {
  id: string; title: string; desc?: string; thumb?: string; videoCount?: number;
};
export type AOCluster = {
  id: string; label: string; span: 1|2|3|4;
  channels: Array<{ id: string; size: 'xs'|'sm'|'lg'|'md' }>;
};
export type AOResponse = { builtAt: string; clusters: AOCluster[] };
```

## Backend plan
- Implement `server/routes/autoOrganize.js` and **mount it** in the Express app (e.g., `app.use('/api/auto-organize', require('./routes/autoOrganize'))`).
- `builder.js`:
  - Load channels from `data/channels.json` (use `channels` array if present, or entire JSON).
  - Normalize each item to `{id,title,desc,thumb,videoCount}` using fields from `title`, `snippet`, `statistics`, `contentDetails`, and `thumbnails`.
  - Heuristic bucketing via `heuristics.js` regex rules (provided).
  - Compute quartiles of `videoCount` → map to sizes: `xs | sm | md | lg`.
  - Map cluster size to tile span: `>=70→4`, `>=50→3`, `>=30→2`, else `1`.
  - Sort channels in a cluster by `videoCount desc, title asc`.
  - Persist `{ builtAt, clusters }` to `/data/autoOrganize.json` (mkdir as needed).
- `GET /api/auto-organize`:
  - Return cached JSON if present; otherwise call `buildAutoOrganize({ force: true })` and return.
- `POST /api/auto-organize/recompute`:
  - Rebuild, then respond `{ ok: true, builtAt }`.
- `POST /api/categories/bulk-assign`:
  - For spike: log payload, return 200 with `{ ok: true, count: channelIds.length }`.
  - If existing category persistence exists, integrate there instead (add a TODO note if not implemented).

### Env flags (future-proofing)
```
USE_EMBEDDINGS=false
USE_AI_LABELS=false
OPENAI_API_KEY= # used only when the above flags are true
```
> Do not implement embeddings/AI in this spike. Keep the code structured so it can be added later.

## Frontend plan
- Create a route to `AutoOrganize` and a simple toggle in the existing nav to switch between Classic Picker and Auto Organize (no routing overhaul).
- Implement the UI per `design/auto_organize_collage_v4_1.html`:
  - 4-col responsive master grid; cluster spans 1/2/3/4 columns; height flows with content.
  - Cluster header with label pill + count + kebab menu.
  - Bubble grid with circular avatars; hover tooltip; selection state; label under avatar.
  - Sticky action bar at bottom: selection count, **drop-up** menu for categories, and Clear.
  - Search input filters clusters by label and (optionally) channels by name.
  - “Show hidden (n)” restores hidden clusters (UI state only).

## Acceptance criteria
- `GET /api/auto-organize` returns data in ≤ 2s with the 503-channel dataset.
- Frontend renders clusters with spans and bubble sizes, includes hover tooltips and multi-select.
- “Add to Category ▾” posts to the bulk-assign endpoint; show a toast on success.
- Hide cluster + “Show hidden (n)” works without page reload.
- Recompute triggers POST then refetch.
- No breaking changes to existing picker/digest functionality.

## QA checklist
- **Endpoints** (from repo root):
  ```bash
  curl -s http://localhost:3000/api/auto-organize | jq '.clusters | length'
  curl -s -X POST http://localhost:3000/api/auto-organize/recompute | jq
  curl -s -X POST http://localhost:3000/api/categories/bulk-assign -H 'Content-Type: application/json'     -d '{"channelIds":["sample1","sample2"],"category":"AI & Emerging Tech"}' | jq
  ```
- **UI**:
  - Large clusters span 3–4 columns; niche clusters span 1–2.
  - Bubble sizes vary (xs→lg) by `videoCount`.
  - Tooltip shows title, description, and “Videos: N”.
  - Drop-up opens upward; Clear resets selection.
  - Search filters clusters and (optionally) bubbles.
  - Hidden clusters can be restored with the chip.

## Workstyle guardrails
- Keep changes **additive**; avoid refactors outside this feature.
- Use **small commits** with clear messages (`feat:`, `chore:`, `fix:`, `docs:`).
- If a file’s structure is unclear, leave a `// TODO(cline):` with the question and proceed minimally.

## Done signal
- PR from `spike/auto-organize` → `main` with a summary, screenshots (or a gif), and notes on any TODOs left for a v2 (embeddings, AI labels, persisted hidden state).
