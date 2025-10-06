// scripts/export_csv.js
// Usage: node scripts/export_csv.js
// Reads:
//   data/autoOrganize.metrics.json
//   data/autoOrganize.debug.json
//   data/channels.json (for names/descriptions)
// Writes:
//   data/ao_cluster_summary.csv
//   data/ao_channels_detailed.csv

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const METRICS = path.join(ROOT, "data/autoOrganize.metrics.json");
const DEBUG = path.join(ROOT, "data/autoOrganize.debug.json");
const CHANNELS = path.join(ROOT, "data/channels.json");
const CSV_SUMMARY = path.join(ROOT, "data/ao_cluster_summary.csv");
const CSV_DETAILED = path.join(ROOT, "data/ao_channels_detailed.csv");

function readJson(p, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return fallback; }
}
function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
function writeCsv(p, rows) {
  const out = rows.map(r => r.map(csvEscape).join(",")).join("\n") + "\n";
  fs.writeFileSync(p, out, "utf8");
}

function main() {
  const metrics = readJson(METRICS, { totals: { channels: 0 }, perCluster: [] });
  const debug = readJson(DEBUG, {});
  const channelsJson = readJson(CHANNELS, { channels: [] });

  // Build id -> {title, description} index from channels.json
  const idx = {};
  for (const c of channelsJson.channels || []) {
    const id = c.id || "";
    if (!id) continue;
    idx[id] = {
      title: c.title || c.name || "",
      description: c.description || "",
    };
  }

  // --- CSV #1: Cluster summary (cluster,count,percent_of_total,purity_if_available)
  const total = metrics?.totals?.channels || 0;
  const summaryRows = [["cluster", "count", "percent_of_total", "purity_if_available"]];
  for (const row of metrics.perCluster || []) {
    const count = row.channelCount ?? row.size ?? 0;
    const pct = total ? (100 * count) / total : 0;
    summaryRows.push([
      row.label || "",
      count,
      pct.toFixed(2),
      row.purity ?? ""
    ]);
  }
  writeCsv(CSV_SUMMARY, summaryRows);

  // --- CSV #2: Detailed per-channel
  // Use .debugRows or .rows
  const rows = (debug.debugRows || debug.rows || []);
  const detailed = [["channelId","channelName","assignedLabel","method","topScore","secondScore","margin","description"]];
  for (const r of rows) {
    const id = r.id || r.channelId || "";
    const meta = idx[id] || {};
    detailed.push([
      id,
      r.name || r.channelName || meta.title || "",
      r.assignedLabel || r.label || "",
      r.method || "scored",
      r.topScore ?? r.score ?? "",
      r.secondScore ?? "",
      r.margin ?? "",
      r.description || meta.description || "",
    ]);
  }
  writeCsv(CSV_DETAILED, detailed);

  // Headline to stdout (so run script can print a summary without jq)
  const headline = {
    channels: total,
    clusters: metrics?.totals?.clusters ?? "",
    unclassified: metrics?.totals?.unclassified ?? ""
  };
  console.log("HEADLINE:", JSON.stringify(headline));
  console.log("WROTE:", CSV_SUMMARY, "and", CSV_DETAILED);
}

main();
