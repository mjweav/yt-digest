#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { buildAutoOrganize, loadChannels, loadOverrides } from '../server/autoOrganize/builder.js';

// Helper function to generate raw clusters without governance
async function generateRawClusters(channels, overrides) {
  const clustersMap = new Map();
  const debugRows = [];

  for (const raw of channels) {
    const ch = {
      id: raw.id || raw.channelId || raw.snippet?.channelId || '',
      title: raw.title || raw.snippet?.title || '',
      desc: raw.desc || raw.description || raw.snippet?.description || '',
      url: raw.url || raw.channelUrl || raw.customUrl || '',
      thumb: raw.thumb || raw.thumbnails?.high?.url || raw.thumbnails?.medium?.url || raw.thumbnails?.default?.url || '',
      videoCount: Number(raw.videoCount ?? raw.contentDetails?.totalItemCount ?? raw.statistics?.videoCount ?? 0) || 0,
    };

    if (!ch.id) continue;

    let label;
    if (overrides[ch.id]) {
      label = overrides[ch.id];
    } else {
      // Import classifyChannel dynamically to avoid circular dependency
      const { classifyChannel } = await import('../server/autoOrganize/heuristics2.js');
      const res = await classifyChannel({ title: ch.title, desc: ch.desc, url: ch.url });
      label = res.label || 'Unclassified';
    }

    if (!clustersMap.has(label)) clustersMap.set(label, { label, items: [] });
    clustersMap.get(label).items.push({
      id: ch.id,
      title: ch.title,
      desc: ch.desc,
      thumb: ch.thumb,
      videoCount: ch.videoCount,
    });

    debugRows.push({
      id: ch.id,
      title: ch.title,
      desc: ch.desc,
      url: ch.url,
      descLen: ch.desc ? ch.desc.length : 0,
      label,
    });
  }

  return Array.from(clustersMap.values()).map(c => ({
    id: c.label.toLowerCase().replace(/\s+/g, '-'),
    label: c.label,
    span: c.items.length >= 90 ? 4 : c.items.length >= 45 ? 3 : c.items.length >= 18 ? 2 : 1,
    channels: c.items
  }));
}

async function exportAutoOrganize() {
  console.log('Starting auto-organize export...');

  try {
    // Load channels and overrides
    const channels = await loadChannels();
    const overrides = await loadOverrides();

    console.log(`Loaded ${channels.length} channels and ${Object.keys(overrides).length} overrides`);

    // Build with debug enabled
    const result = await buildAutoOrganize({
      channels,
      overrides,
      debug: true
    });

    const { clusters, debugRows } = result;

    console.log(`Generated ${clusters.length} clusters and ${debugRows.length} debug rows`);

    // Write debug data (governed)
    const debugPath = path.join('data', 'autoOrganize.debug.json');
    await fs.promises.writeFile(debugPath, JSON.stringify({ clusters, debugRows }, null, 2));
    console.log(`Wrote debug data to ${debugPath}`);

    // Generate governed metrics
    const metrics = generateMetrics(clusters, debugRows);

    // Write governed metrics
    const metricsPath = path.join('data', 'autoOrganize.metrics.json');
    await fs.promises.writeFile(metricsPath, JSON.stringify(metrics, null, 2));
    console.log(`Wrote governed metrics to ${metricsPath}`);

    // Generate raw (un-governed) metrics for reference
    const rawClusters = await generateRawClusters(channels, overrides);
    const rawMetrics = generateMetrics(rawClusters, debugRows);

    // Write raw metrics
    const rawMetricsPath = path.join('data', 'autoOrganize.metrics.raw.json');
    await fs.promises.writeFile(rawMetricsPath, JSON.stringify(rawMetrics, null, 2));
    console.log(`Wrote raw metrics to ${rawMetricsPath}`);

    console.log('Export completed successfully');
    return { clusters, debugRows, metrics };

  } catch (error) {
    console.error('Error during export:', error);
    process.exit(1);
  }
}

function generateMetrics(clusters, debugRows) {
  const totalChannels = debugRows.length;
  const totalClusters = clusters.length;
  const unclassifiedCount = debugRows.filter(row => row.label === 'Unclassified').length;

  // Count channels per cluster
  const clusterChannelCounts = {};
  clusters.forEach(cluster => {
    clusterChannelCounts[cluster.label] = cluster.channels.length;
  });

  // Analyze classification methods
  const methodStats = {};
  debugRows.forEach(row => {
    const method = row.why?.mode || 'unknown';
    methodStats[method] = (methodStats[method] || 0) + 1;
  });

  // Per-cluster metrics
  const perClusterMetrics = clusters.map(cluster => {
    const clusterChannels = cluster.channels;
    const clusterDebugRows = debugRows.filter(row => row.label === cluster.label);

    const clusterMethodStats = {};
    clusterDebugRows.forEach(row => {
      const method = row.why?.mode || 'unknown';
      clusterMethodStats[method] = (clusterMethodStats[method] || 0) + 1;
    });

    return {
      label: cluster.label,
      size: clusterChannels.length,
      channelCount: clusterChannels.length,
      purity: cluster.purity || 0,
      methodStats: clusterMethodStats
    };
  });

  return {
    totals: {
      channels: totalChannels,
      clusters: totalClusters,
      unclassified: unclassifiedCount
    },
    perCluster: perClusterMetrics,
    methodStats: methodStats,
    generatedAt: new Date().toISOString()
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exportAutoOrganize().catch(console.error);
}

export { exportAutoOrganize, generateMetrics };
