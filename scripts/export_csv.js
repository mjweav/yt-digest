// scripts/export_csv.js
// Usage: node scripts/export_csv.js
// Inputs:
//   data/autoOrganize.metrics.json
//   data/autoOrganize.debug.json
//   data/channels.json (for channelName/description fallback)
// Outputs:
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

function readJsonSafe(p, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
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

function buildChannelIndex(channelsJson) {
  const idx = {};
  const arr = channelsJson.channels || [];
  for (const c of arr) {
    const id = c.id || "";
    if (!id) continue;
    idx[id] = {
      title: c.title || c.name || "",
      description: c.description || ""
    };
  }
  return idx;
}

function main() {
  const metrics = readJsonSafe(METRICS, { totals: { channels: 0 }, perCluster: [] });
  const debug = readJsonSafe(DEBUG, {});
  const channelsJson = readJsonSafe(CHANNELS, { channels: [] });

  const total = metrics?.totals?.channels || 0;

  // ---- CSV #1: Cluster summary
  const summaryRows = [["cluster", "count", "percent_of_total", "purity_if_available"]];
  for (const row of metrics.perCluster || []) {
    const label = row.label || "";
    const count = row.channelCount ?? row.size ?? 0;
    const pct = total ? ((100 * count) / total).toFixed(2) : "0.00";
    const purity = row.purity ?? ""; // will populate once builder computes purity
    summaryRows.push([label, count, pct, purity]);
  }
  writeCsv(CSV_SUMMARY, summaryRows);

  // ---- CSV #2: Detailed per-channel (sorted by cluster label, then channel name)
  const idx = buildChannelIndex(channelsJson);
  const rows = debug.debugRows || debug.rows || [];
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
      r.description || meta.description || ""
    ]);
  }

  // Sort by cluster (col 3) then name (col 2)
  const header = detailed.shift();
  detailed.sort((a, b) => {
    const la = (a[2] || "").toLowerCase();
    const lb = (b[2] || "").toLowerCase();
    if (la !== lb) return la < lb ? -1 : 1;
    const na = (a[1] || "").toLowerCase();
    const nb = (b[1] || "").toLowerCase();
    if (na < nb) return -1;
    if (na > nb) return 1;
    return 0;
  });
  detailed.unshift(header);

  writeCsv(CSV_DETAILED, detailed);

  // Print headline for convenience
  const headline = {
    channels: total,
    clusters: metrics?.totals?.clusters ?? "",
    unclassified: metrics?.totals?.unclassified ?? ""
  };
  console.log("HEADLINE:", JSON.stringify(headline));
  console.log("WROTE:", CSV_SUMMARY, "and", CSV_DETAILED);
}

main();
