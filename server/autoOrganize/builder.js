import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { classifyChannel } from './heuristics2.js';
import { resolveDataPath } from '../utils/paths.js';

async function loadTaxonomy() {
  const p = path.join(path.dirname(new URL(import.meta.url).pathname), 'taxonomy.json');
  try {
    const data = await fsp.readFile(p, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading taxonomy:', error);
    return {
      displayCapFormula: { base: 25, min: 12, max: 40 },
      minMicrotopicSize: 5,
      minPurity: 0.7,
      promoteAllowlist: ["Video Editing & Creative Tools"],
      promoteBlocklist: []
    };
  }
}

async function loadJSON(p, fallback) {
  try { return JSON.parse(await fsp.readFile(p, 'utf8')); }
  catch { return fallback; }
}

async function loadChannels() {
  const p = resolveDataPath('channels.json');
  console.log('Loading channels from:', p);

  try {
    const raw = await loadJSON(p, []);
    console.log('Raw channels data type:', typeof raw);
    console.log('Raw channels keys:', raw ? Object.keys(raw) : 'null');

    // handle possible shapes
    if (Array.isArray(raw)) {
      console.log('Returning raw array, length:', raw.length);
      return raw;
    }
    if (Array.isArray(raw.channels)) {
      console.log('Returning raw.channels, length:', raw.channels.length);
      return raw.channels;
    }
    if (Array.isArray(raw.items)) {
      console.log('Returning raw.items, length:', raw.items.length);
      return raw.items;
    }

    console.log('No valid array found in channels data');
    return [];
  } catch (error) {
    console.error('Error loading channels:', error);
    return [];
  }
}

async function loadOverrides() {
  const p = resolveDataPath('autoOrganize.overrides.json');
  return await loadJSON(p, {});
}

function normalizeChannel(c) {
  // accept both your normal form and YT API-ish shape
  const title =
    c.title || c.snippet?.title || '';
  const desc =
    c.desc || c.description || c.snippet?.description || '';
  const url =
    c.url || c.channelUrl || c.customUrl || '';
  const thumbs =
    c.thumbnails || c.snippet?.thumbnails || {};
  const thumb =
    thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || c.thumb || '';
  const videoCount =
    c.videoCount ?? c.contentDetails?.totalItemCount ?? c.statistics?.videoCount ?? 0;

  return {
    id: c.id || c.channelId || c.snippet?.channelId || '',
    title,
    desc,
    url,
    thumb,
    videoCount: Number(videoCount) || 0,
  };
}

function sizeFromCount(n) {
  if (n > 1500) return 'lg';
  if (n > 400) return 'md';
  if (n > 50) return 'sm';
  return 'xs';
}

function spanFromCount(n) {
  if (n >= 90) return 4;
  if (n >= 45) return 3;
  if (n >= 18) return 2;
  return 1;
}

async function buildAutoOrganize({ channels, overrides, debug } = {}) {
  console.log('buildAutoOrganize called with:', {
    channelsProvided: Array.isArray(channels) ? channels.length : 'none',
    overridesProvided: overrides ? Object.keys(overrides).length : 'none',
    debug
  });

  const src = Array.isArray(channels) ? channels : await loadChannels();
  console.log('Loaded channels count:', Array.isArray(src) ? src.length : 'not array');

  const ov  = overrides || await loadOverrides();
  console.log('Loaded overrides count:', Object.keys(ov).length);

  const clustersMap = new Map();
  const debugRows = [];

  if (!Array.isArray(src)) {
    console.error('Source is not an array:', typeof src, src);
    return { clusters: [], debugRows: [] };
  }

  for (const raw of src) {
    const ch = normalizeChannel(raw);
    if (!ch.id) {
      console.warn('Channel missing ID:', raw);
      continue;
    }

    let label, why;
    if (ov[ch.id]) {
      label = ov[ch.id];
      why = { mode: 'override', label };
    } else {
      const res = await classifyChannel({ title: ch.title, desc: ch.desc, url: ch.url });
      label = res.label || 'Unclassified';
      why = { mode: 'scored', label, best: res.best, runner: res.runner, scores: res.scores, margin: res.margin };
    }

    if (!clustersMap.has(label)) clustersMap.set(label, { label, items: [] });
    clustersMap.get(label).items.push({
      id: ch.id,
      title: ch.title,
      desc: ch.desc,
      thumb: ch.thumb,
      videoCount: ch.videoCount,
      size: sizeFromCount(ch.videoCount),
      ...(debug ? { why } : {})
    });

    if (debug) {
      debugRows.push({
        id: ch.id,
        title: ch.title,
        desc: ch.desc,
        url: ch.url,
        descLen: ch.desc ? ch.desc.length : 0,
        label,
        why
      });
    }
  }

  const rawClusters = Array.from(clustersMap.values()).map(c => ({
    id: c.label.toLowerCase().replace(/\s+/g, '-'),
    label: c.label,
    span: spanFromCount(c.items.length),
    channels: c.items
  }));

  // Load taxonomy for governance
  const taxonomy = await loadTaxonomy();

  // Compute per-cluster purity = average margin of member channels
  const clustersWithPurity = rawClusters.map(cluster => {
    const channelsWithMargins = cluster.channels
      .map(ch => ch.why?.margin)
      .filter(margin => margin !== undefined);

    const avgPurity = channelsWithMargins.length > 0
      ? channelsWithMargins.reduce((sum, margin) => sum + margin, 0) / channelsWithMargins.length
      : 0;

    return {
      ...cluster,
      purity: avgPurity
    };
  });

  // Compute displayCap from taxonomy.displayCapFormula and totals.channels
  const totalChannels = debugRows.length;
  const rawDisplayCap = Math.floor(totalChannels / taxonomy.displayCapFormula.base);
  const displayCap = Math.max(
    taxonomy.displayCapFormula.min,
    Math.min(rawDisplayCap, taxonomy.displayCapFormula.max)
  );

  // Build reportingClusters with governance
  const promoted = [];
  const demoted = [];

  for (const cluster of clustersWithPurity) {
    const isAllowlisted = taxonomy.promoteAllowlist.includes(cluster.label);
    const meetsSizeRequirement = cluster.channels.length >= taxonomy.minMicrotopicSize;
    const meetsPurityRequirement = cluster.purity >= taxonomy.minPurity;

    if (isAllowlisted || (meetsSizeRequirement && meetsPurityRequirement)) {
      promoted.push({
        label: cluster.label,
        size: cluster.channels.length,
        purity: cluster.purity
      });
    } else {
      demoted.push({
        label: cluster.label,
        size: cluster.channels.length,
        purity: cluster.purity
      });
    }
  }

  // Sort demoted clusters by size desc, purity desc for potential promotion
  demoted.sort((a, b) => {
    if (a.size !== b.size) return b.size - a.size;
    return b.purity - a.purity;
  });

  // If we have too many promoted clusters, demote the smallest/least-pure ones
  if (promoted.length > displayCap) {
    const excessCount = promoted.length - displayCap;
    const toDemote = promoted.splice(-excessCount);
    demoted.push(...toDemote);

    // Re-sort demoted after adding new items
    demoted.sort((a, b) => {
      if (a.size !== b.size) return b.size - a.size;
      return b.purity - a.purity;
    });
  }

  const reportingClusters = promoted.map(({ label, size, purity }) => {
    const originalCluster = clustersWithPurity.find(c => c.label === label);
    return {
      id: originalCluster.id,
      label: originalCluster.label,
      span: originalCluster.span,
      channels: originalCluster.channels
    };
  });

  // Add reportingDiagnostics to debug
  const reportingDiagnostics = {
    promoted: promoted.map(({ label, size, purity }) => ({ label, size, purity })),
    demoted: demoted.map(({ label, size, purity }) => ({ label, size, purity })),
    thresholds: {
      minSize: taxonomy.minMicrotopicSize,
      minPurity: taxonomy.minPurity,
      displayCap: displayCap
    }
  };

  // Add governance diagnostics to the first debug row if debug is enabled
  if (debug && debugRows.length > 0) {
    debugRows[0]._governance = reportingDiagnostics;
  }

  console.log('buildAutoOrganize returning:', {
    clustersCount: reportingClusters.length,
    debugRowsCount: debugRows.length,
    displayCap,
    promotedCount: promoted.length,
    demotedCount: demoted.length
  });

  return { clusters: reportingClusters, debugRows };
}

export { buildAutoOrganize, loadChannels, loadOverrides };
