{
  "version": 1,
  "description": "Prevent context stalls from large JSON; enforce streaming validation.",
  "rules": [
    {
      "id": "no-open-large-json",
      "match": { "globs": ["data/*.json", "data/**/*.json"] },
      "actions": {
        "never_open_in_editor": true,
        "never_paste_file_contents": true,
        "reason": "Large JSON causes context overload. Use CLI filtering instead."
      }
    },
    {
      "id": "use-stream-tools",
      "match": { "globs": ["**/*"] },
      "actions": {
        "preferred_cli_tools": ["jq", "rg", "grep", "wc", "head", "tail", "node"],
        "instructions": [
          "For metrics, run node scripts/exportAO.js and node scripts/compare_metrics.js.",
          "To inspect data/*.json, run jq/rg with tight filters and print only small excerpts to the console.",
          "Never open or cat full JSON files."
        ]
      }
    }
  ]
}
