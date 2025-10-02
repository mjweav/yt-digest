# Autosave Primer — 700ms debounce / batch size ≈10

**Purpose**

Short implementation plan for optimistic autosave (autosave ON by default) using a simple, low-friction approach suitable for an indie MVP. This primer avoids code snippets — use your existing project context and micro‑prompts in Cline to implement.

---

## Bottom-line decisions (agreed)
- **Debounce window:** 700 ms (client-side).
- **Batching target:** coalesce ~10 ops per flush (client should also flush earlier when queue grows large).
- **Persistence:** local queue persisted to IndexedDB (localForage) for durability across reloads and device switches.
- **Store (POC):** JSON-on-disk per-user files via a small DAL (`jsonStore`) with atomic writes. Later swap to Postgres/Prisma (`pgStore`) using the same DAL API.
- **Server API:** single endpoint `POST /api/selections/batch` that accepts `{ userId, changes[] }` and returns canonical selections.
- **UI behavior:** optimistic updates on toggle; show transient `Queued` or `Saved` indicator; keep a Save button as fallback during rollout.

---

## Client responsibilities (high level)
- Update selection state **optimistically** when user toggles.
- Add change to local queue and persist to IndexedDB.
- Debounce and flush queue after 700 ms of inactivity or when queue length exceeds a threshold (e.g., 10).
- On flush: send batch to `/api/selections/batch`; clear persisted queue optimistically; on failure, requeue and retry with backoff.
- Deduplicate queued ops (keep only the most recent operation per channel) before persisting and before sending.
- Provide visible status: `Queued` while pending, `Saved` on successful server ack, and `Retrying/Error` for persistent failures.

---

## Server responsibilities (high level)
- Expose `POST /api/selections/batch` that accepts batched ops and applies them transactionally via the DAL.
- Implement a small DAL interface with two pluggable backends: `jsonStore` (POC) and `pgStore` (future). Keep the API identical:
  - `applySelectionBatch(userId, changes) -> canonicalSelections`
  - `readUserSelections(userId) -> selections`
- For `jsonStore` write per-user JSON file atomically (`tmp -> rename`) to avoid partial writes.
- Apply ops in order (last-write-wins per channel) and return the canonical selection list in the response for reconciliation.
- Log `batchSize` and `flushOutcome` for monitoring purposes.

---

## UX & features
- **Auto-save ON by default.** Add a simple settings toggle to allow power users to disable autosave if desired.
- **Save button** remains visible during initial rollout as "Force sync now" (safe rollback control).
- **Indicators:** small per-page indicator showing `Queued` vs `Saved`, plus toast/snackbar for persistent failure or network offline.
- **Undo:** provide immediate undo for a short window (5–10s) by keeping a tiny in-memory undo buffer.

---

## Offline & multi-device considerations
- Persist queued ops to IndexedDB so changes survive reloads and temporary offline periods.
- A per-user JSON file reduces concurrent write collisions for local POC; Dropbox conflicts are possible — monitor for `conflicted copy` filenames.
- For cross-device handoff: recommend a lightweight `/docs/CONTEXT.md` and session recap to speed rehydration when switching machines.

---

## Metrics to capture (minimal)
- `batchesProcessed` (count)
- `avgBatchSize`
- `failedFlushes` and `failureRate` (failedFlushes / batchesProcessed)
- `queuedOpsPerUser` (sampled)
- `dbWritesPerMinute` (derived server-side)
Log these to console or lightweight metrics store during POC; set an alert if `failureRate > 5%`.

---

## Testing and rollout plan
1. **Local dev:** implement client queue + `/api/selections/batch` + `jsonStore`. Test single-machine flows. Validate atomic file writes.
2. **Cross-machine manual test:** use Dropbox or run one machine against dev server; perform toggles on machine A, then on B. Check JSON snapshots and observe queued/saved status.
3. **Soft rollout:** enable autosave by default, but keep the Save button visible for 1–2 weeks. Monitor logs and metrics daily.
4. **Tune debounce/batch:** increase batch size or debounce slightly if DB write rate is high; reduce if UX feels sluggish.

---

## Migration plan to Postgres/Prisma (summary)
- Implement `pgStore` matching `jsonStore` API.
- Provide a migration script that reads all `/data/selections/*.json` and inserts/upserts rows into Postgres.
- Switch server to use `pgStore` behind a config flag or env var and deploy to staging first.
- Validate canonical state and reconcile any discrepancies before cutting over production.

---

## Rollback & safety
- Default to per-user JSON and atomic writes — easy to roll back by swapping DAL import in server.
- Keep a Save button and a feature flag to disable autosave quickly if unexpected issues arise.
- Maintain backups of JSON files prior to migration.

---

## Minimal checklist (actionable)
- [ ] Add client queue persisted via IndexedDB (localForage).
- [ ] Debounce flush at 700 ms and target ~10 ops per flush.
- [ ] Implement `POST /api/selections/batch` that calls `jsonStore.applySelectionBatch`.
- [ ] Add `jsonStore` with atomic writes and per-user files.
- [ ] Show `Queued` / `Saved` indicators and keep Save button as fallback.
- [ ] Log `batchSize` and `flushOutcome`; monitor metrics for 1–2 weeks.
- [ ] Add `pgStore` skeleton and migration script for future cutover.

---

**Notes**
- This approach gives excellent UX for an MVP while keeping engineering debt low and a clear migration path. It intentionally favors a modest, safe implementation over premature optimization.

---

_End of primer.md_
