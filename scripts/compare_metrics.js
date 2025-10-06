// scripts/compare_metrics.js
// Compares two auto-organize metrics files and generates a diff report

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

function formatDate(date) {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

function getMovedChannels(oldDebug, newDebug) {
  const oldById = new Map();
  const newById = new Map();

  // Build maps of channel ID to label
  oldDebug.forEach(ch => oldById.set(ch.id, ch.label));
  newDebug.forEach(ch => newById.set(ch.id, ch.label));

  const moved = [];

  // Find channels that changed classification
  for (const [id, newLabel] of newById) {
    const oldLabel = oldById.get(id);
    if (oldLabel && oldLabel !== newLabel) {
      moved.push({
        id,
        from: oldLabel,
        to: newLabel
      });
    }
  }

  return moved;
}

function generateDiffReport(oldMetrics, newMetrics, oldDebug, newDebug) {
  const oldTotals = oldMetrics.totals;
  const newTotals = newMetrics.totals;
  const movedChannels = getMovedChannels(oldDebug, newDebug);

  const dateStr = formatDate(new Date());

  let report = `# Auto-Organize Metrics Diff Report - ${dateStr}

Comparison of auto-organize metrics to track classification changes.

## Summary

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| **Total Channels** | ${oldTotals.channels} | ${newTotals.channels} | ${newTotals.channels - oldTotals.channels} |
| **Total Clusters** | ${oldTotals.clusters} | ${newTotals.clusters} | ${newTotals.clusters - oldTotals.clusters} |
| **Unclassified** | ${oldTotals.unclassifiedCount} | ${newTotals.unclassifiedCount} | ${newTotals.unclassifiedCount - oldTotals.unclassifiedCount} |

`;

  if (newTotals.unclassifiedCount < oldTotals.unclassifiedCount) {
    report += `✅ **Improvement**: Unclassified count decreased by ${oldTotals.unclassifiedCount - newTotals.unclassifiedCount} channels\n\n`;
  } else if (newTotals.unclassifiedCount > oldTotals.unclassifiedCount) {
    report += `⚠️ **Regression**: Unclassified count increased by ${newTotals.unclassifiedCount - oldTotals.unclassifiedCount} channels\n\n`;
  } else {
    report += `➡️ **No Change**: Unclassified count remained the same\n\n`;
  }

  // Per-cluster comparison
  report += `## Per-Cluster Changes

| Cluster | Before | After | Delta | Change |
|---------|--------|-------|-------|--------|
`;

  const allLabels = new Set([
    ...oldMetrics.perCluster.map(c => c.label),
    ...newMetrics.perCluster.map(c => c.label)
  ]);

  const sortedLabels = Array.from(allLabels).sort();

  for (const label of sortedLabels) {
    const oldCluster = oldMetrics.perCluster.find(c => c.label === label);
    const newCluster = newMetrics.perCluster.find(c => c.label === label);

    const oldCount = oldCluster ? oldCluster.channelCount : 0;
    const newCount = newCluster ? newCluster.channelCount : 0;
    const delta = newCount - oldCount;

    let changeIndicator = '';
    if (delta > 0) changeIndicator = '↗️';
    else if (delta < 0) changeIndicator = '↘️';
    else changeIndicator = '➡️';

    report += `| ${label} | ${oldCount} | ${newCount} | ${delta > 0 ? '+' : ''}${delta} | ${changeIndicator} |\n`;
  }

  report += `\n## Channel Movements

`;

  if (movedChannels.length === 0) {
    report += `No channels changed classification between the two runs.\n`;
  } else {
    report += `**${movedChannels.length} channels** changed classification:\n\n`;

    // Group by from->to
    const movements = new Map();
    movedChannels.forEach(ch => {
      const key = `${ch.from} → ${ch.to}`;
      if (!movements.has(key)) {
        movements.set(key, []);
      }
      movements.get(key).push(ch.id);
    });

    for (const [movement, ids] of movements) {
      report += `### ${movement}\n`;
      report += `- **Count**: ${ids.length} channels\n`;
      report += `- **Channel IDs**: ${ids.join(', ')}\n\n`;
    }
  }

  report += `## Validation Status

`;

  // Check invariants
  const invariantsOk = (
    newTotals.channels === oldTotals.channels &&
    newTotals.clusters >= oldTotals.clusters &&
    newTotals.unclassifiedCount <= oldTotals.unclassifiedCount
  );

  if (invariantsOk) {
    report += `✅ **Invariants Maintained**: All core metrics are within acceptable bounds.\n`;
  } else {
    report += `❌ **Invariants Violated**: Some metrics changed in unexpected ways.\n`;
  }

  report += `\n## Files Compared

- **Before**: Generated ${new Date(oldMetrics.generatedAt).toISOString()}
- **After**: Generated ${new Date(newMetrics.generatedAt).toISOString()}

`;

  return report;
}

async function compareMetrics(oldPath, newPath) {
  try {
    // Load metrics files
    const oldMetrics = JSON.parse(await fsp.readFile(oldPath, 'utf8'));
    const newMetrics = JSON.parse(await fsp.readFile(newPath, 'utf8'));

    // Load debug files for channel movement analysis
    const oldDebugPath = oldPath.replace('metrics.json', 'debug.json');
    const newDebugPath = newPath.replace('metrics.json', 'debug.json');

    let oldDebug = [];
    let newDebug = [];

    try {
      oldDebug = JSON.parse(await fsp.readFile(oldDebugPath, 'utf8'));
    } catch (e) {
      console.warn(`Could not load old debug file: ${oldDebugPath}`);
    }

    try {
      newDebug = JSON.parse(await fsp.readFile(newDebugPath, 'utf8'));
    } catch (e) {
      console.warn(`Could not load new debug file: ${newDebugPath}`);
    }

    // Generate report
    const report = generateDiffReport(oldMetrics, newMetrics, oldDebug, newDebug);

    // Write report
    const dateStr = formatDate(new Date());
    const reportPath = `docs/ao_diff_${dateStr}.md`;
    await fsp.writeFile(reportPath, report);

    console.log(`Diff report written to: ${reportPath}`);
    console.log(report);

    return report;

  } catch (error) {
    console.error('Error comparing metrics:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.log('Usage: node scripts/compare_metrics.js <old-metrics.json> <new-metrics.json>');
    console.log('Example: node scripts/compare_metrics.js data/autoOrganize.baseline.json data/autoOrganize.metrics.json');
    process.exit(1);
  }

  const [oldPath, newPath] = args;
  await compareMetrics(oldPath, newPath);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { compareMetrics, generateDiffReport };
