import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { classifyChannel } from './heuristics2.js';
import { resolveDataPath } from '../utils/paths.js';

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
      why = { mode: 'scored', label, best: res.best, runner: res.runner, scores: res.scores };
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

  const clusters = Array.from(clustersMap.values()).map(c => ({
    id: c.label.toLowerCase().replace(/\s+/g, '-'),
    label: c.label,
    span: spanFromCount(c.items.length),
    channels: c.items
  }));

  console.log('buildAutoOrganize returning:', {
    clustersCount: clusters.length,
    debugRowsCount: debugRows.length
  });

  return { clusters, debugRows };
}

export { buildAutoOrganize, loadChannels, loadOverrides };
