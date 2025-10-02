# Workflow: Add or Update UI Feature / Component

**Purpose:** Use this workflow whenever you add or update React components or frontend features.

## Steps

1. Add or update the React component in `src/components/...` or `src/pages/...`.
2. If replacing an element, remove old code (avoid duplication).
3. Update Tailwind styling and confirm responsiveness across devices.
4. If interactive, wire to backend API call.
5. Validate manually: run `npm run dev`, check layout & interaction.
6. Update `CHANGELOG.md` with a short note.
7. Create Commit Message with prefix: `feat(ui): ...`.
