# Node.js Execution Rules

**Inline Script Safety**
- Do NOT execute `node -e "..."` inline when the script contains:
  - Newlines
  - Template literals (`` `...` ``)
  - String interpolation (`${...}`)
  - Backticks
  - Exclamation marks (`!`)
  - Emoji characters
  - Length > 200 characters
- Instead: create a temporary `.js` file in repo/cwd, write the exact script (preserve backticks/template strings), run `node <tempfile>`, and notify the user.

**Bypass Option**
- Require explicit `--allow-inline-node` flag to bypass this rule when user specifically requests inline execution.

**Rationale**
Running multi-line JS through `node -e` exposes the shell to interpolation, history expansion, and quoting problems (zsh `dquote>` or `event not found`). To avoid accidental shell mangling or injection, always run multi-line or complex JS from a file rather than inline.
