# Workflow: Add or Update Backend API Endpoint

**Purpose:** Use this workflow whenever you extend the backend API (e.g. new YouTube endpoint, settings handler).

## Steps

1. Define the new route in `server/routes/...`.
2. Add logic in `server/utils/...` if needed.
3. Update `server/index.js` to register the route.
4. Update or create corresponding API docs in `README.md`.
5. Add validation steps (curl test or Postman request).
6. **Present commit message in concise bullet format for user approval** (do not commit automatically)`.
