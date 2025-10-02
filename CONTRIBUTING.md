# CONTRIBUTING

Guidelines for developing with YT Digest, especially when working with Cline or AI assistants.

## Prompting Rules
- Always specify whether to **add**, **update**, or **remove** UI elements.  
  - Example: "Update the button" (not "Add a button") if it replaces an existing element.  
- Require Cline to update `/docs/PRD.md` when major new features are added.  
- Keep PRD concise: use `CHANGELOG.md` for detailed phase history.

## Code Conventions
- React components in `/client/src/pages`
- Server routes in `/server/routes`
- Utilities in `/server/utils`
- Data stored in `/data/*.json`
- Prefer Tailwind utility classes for styling

## Workflow
1. Write prompt → specify "update" vs "add".  
2. Test locally → confirm changes.  
3. Update PRD/CHANGELOG if needed.  
4. Commit and push with meaningful message.

