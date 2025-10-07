# YT‑Digest Patches Workflow (on‑disk SOP)

This folder holds **small, surgical change specs** (“PatchCards”) that Cline can apply reliably without loading big JSONs.

## How to use a Patch
1. Open the specific patch folder (e.g., `patches/2025-10-06_news-bleed-v1/`) and **review `PatchCard.md`**.
2. In Cline chat, paste a short prompt referencing the **explicit path** to the PatchCard:
   ```
   You are continuing work on the YT-Digest project.
   Please apply the patch at ./patches/2025-10-06_news-bleed-v1/PatchCard.md exactly as written.
   ```
3. Let Cline make the changes and run the **Validation** commands listed in the card.
4. Ensure the **Acceptance gates** pass. If not, fix or roll back.
5. Commit with the card’s **Conventional Commit** message.

> Always reference a **specific** patch path (never “latest”) to avoid ambiguity.

## Patch folder layout
```
patches/
  YYYY-MM-DD_slug/
    PatchCard.md    # authoritative spec (what to change + validation + commit)
    context.md      # optional 3–8 lines of rationale
    probes.sh       # optional tiny shell with the jq probes to run
    README.md       # optional 1-line summary
```

## Tips
- Keep each patch **tiny**. If edits get long, split into multiple PatchCards.
- Use the skeleton in `patches/_skeleton/` to start a new patch quickly.
- Never load large `/data/*.json` into context; use `jq` to print tiny excerpts only.
- Always end patches with: **“update changelog.md accordingly.”**
