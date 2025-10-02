# PRD: Subscription Curator Spike (Local JSON Storage)


---

## Phase 7: OAuth Settings & Token Refresh

### Objective
Move Google OAuth authentication into a dedicated Settings page. Persist tokens so that authentication becomes a one-time setup, with automatic refresh when tokens expire.

### Features
- **Backend**
  - `getAuthorizedClient(userId)` helper reads tokens from `users.json`, refreshes if expired, and updates tokens.
  - `/api/auth/status` returns auth status and account info.
  - `/api/auth/disconnect` clears tokens for logout.
- **Frontend**
  - New `/settings` page:
    - Shows connection status.
    - “Connect with Google” button if not connected.
    - Shows connected account with option to disconnect.
  - On startup, check `/api/auth/status`. Redirect to Settings if not connected.
  - Remove OAuth buttons from Channel Picker; redirect to Settings if unauthorized.

### Success Criteria
- First-time: User connects via Settings and tokens persist.
- Returning: User is auto-authorized, no need to reconnect.
- Expired tokens auto-refresh and update storage.
- Disconnect clears tokens and redirects to Settings.

---

## Phase 8: Alpha Jump Navigation (Initial Horizontal)

### Objective
Enable users to quickly jump to subscriptions by their first letter.

### Features
- A horizontal A–Z bar above the channel list.
- Clicking a letter scrolls to the first channel with that starting letter.
- Case-insensitive alphabetical sort required.

### Issues
- Consumes vertical space.
- Not ideal for long lists (500+ channels).
- Later superseded by Phase 9.

---

## Phase 9: Vertical Alpha Navigation Rail (Final Approach)

### Objective
Replace the horizontal alpha navigation bar with a vertical rail (desktop) and floating A–Z button (mobile).

### Features
- **Desktop**
  - Vertical A–Z rail pinned to right side of channel list container.
  - Clicking a letter scrolls smoothly to the first matching channel.
  - “#” for non-alpha titles.
- **Mobile**
  - Hide vertical rail.
  - Show floating “A–Z” button bottom-right.
  - On tap, open overlay with letter grid (A–Z + #). Selecting a letter scrolls and closes overlay.
- **DOM Structure**
  - Each channel card has `data-alpha` or `id` for scroll target.

### Notes
- Remove any prior horizontal A–Z bar (superseded).
- Ensure scroll performance with 500+ channels.
- Styling: slim rail, hover effects, accessible aria-labels.

---

## Implementation Guidance for Cline Prompts

When writing Cline prompts:
- Always specify if you are **adding**, **updating**, or **removing** UI elements/components.
- If replacing, explicitly say: “Remove X” then “Add Y” to avoid duplicates.
- Example: “Remove the existing horizontal A–Z bar. Add a vertical A–Z rail.”

