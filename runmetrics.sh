#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_URL="http://localhost:3001/api/auto-organize?debug=1"

METRICS_JSON="$ROOT_DIR/data/autoOrganize.metrics.json"
BASELINE_JSON="$ROOT_DIR/data/autoOrganize.metrics.baseline.json"

echo "=== YT-Digest: refresh metrics + export CSVs (Node-only) ==="

# deps
command -v curl >/dev/null 2>&1 || { echo "Missing dependency: curl"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Missing dependency: node"; exit 1; }

# 1) Refresh via API; fallback to exporter script
echo "--> Refreshing via API: $API_URL"
HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$API_URL" || echo "000")
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "API refresh returned HTTP $HTTP_CODE; falling back to scripts/exportAO.js"
  node "$ROOT_DIR/scripts/exportAO.js"
fi

# 2) Export CSVs and print headline (no jq)
node "$ROOT_DIR/scripts/export_csv.js"

# 3) Optional metrics->metrics diff (simple)
if [[ -f "$BASELINE_JSON" ]] && [[ -f "$ROOT_DIR/scripts/compare_metrics_simple.js" ]]; then
  echo "--> Comparing against baseline metrics (simple)..."
  node "$ROOT_DIR/scripts/compare_metrics_simple.js" "$BASELINE_JSON" "$METRICS_JSON" || true
fi

# 4) Writing low-margin CSV
echo "--> Writing low-margin CSV..."
node scripts/export_lowmargin.js --perCluster=15 --overall=50


echo "=== Done."
