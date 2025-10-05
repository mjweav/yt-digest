import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { classifyChannel } from './heuristics3.js';
import { resolveDataPath } from '../utils/paths.js';
import { stableHash } from '../utils/hash.js';

// Simple tokenizer and stopwords for TF-IDF
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it',
  'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with', 'have', 'had', 'has', 'do',
  'does', 'did', 'but', 'or', 'not', 'no', 'yes', 'this', 'these', 'those', 'they', 'them',
  'their', 'there', 'here', 'where', 'when', 'why', 'how', 'what', 'which', 'who', 'whom',
  'i', 'me', 'my', 'you', 'your', 'we', 'us', 'our', 'she', 'her', 'he', 'him', 'his',
  'it', 'its', 'they', 'them', 'their', 'channel', 'video', 'videos', 'subscribe', 'like',
  'comment', 'share', 'watch', 'new', 'latest', 'today', 'daily', 'weekly', 'monthly'
]);

function tokenize(text) {
  return text.toLowerCase()
    .normalize('NFKD') // Normalize diacritics
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !STOPWORDS.has(word))
    .reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});
}

function cosineSimilarity(vecA, vecB) {
  const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dotProduct = 0, normA = 0, normB = 0;

  for (const key of allKeys) {
    const a = vecA[key] || 0;
    const b = vecB[key] || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

function buildTfIdfVectors(channels) {
  const vectors = new Map();
  const documentFreq = new Map();

  // Build document frequency (DF) for IDF calculation
  for (const ch of channels) {
    if (ch.label && ch.label !== 'Unclassified') {
      const tokens = tokenize(`${ch.title} ${ch.desc}`);
      const uniqueTokens = new Set(Object.keys(tokens));

      for (const token of uniqueTokens) {
        documentFreq.set(token, (documentFreq.get(token) || 0) + 1);
      }
    }
  }

  // Build TF-IDF vectors for classified channels only
  for (const ch of channels) {
    if (ch.label && ch.label !== 'Unclassified') {
      const tokens = tokenize(`${ch.title} ${ch.desc}`);
      const vector = {};

      for (const [token, tf] of Object.entries(tokens)) {
        const df = documentFreq.get(token) || 1;
        const idf = Math.log(channels.length / df);
        vector[token] = tf * idf;
      }

      vectors.set(ch.id, { vector, label: ch.label });
    }
  }

  return { vectors, documentFreq };
}

function findNearestNeighbors(targetVector, classifiedVectors, k = 12) {
  const similarities = [];

  for (const [id, { vector, label }] of classifiedVectors) {
    const similarity = cosineSimilarity(targetVector, vector);
    if (similarity > 0) {
      similarities.push({ id, label, similarity });
    }
  }

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
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

  // Enhanced description hydration - try multiple sources in order
  let desc = '';
  if (c.desc) desc = c.desc;
  else if (c.description) desc = c.description;
  else if (c.snippet?.description) desc = c.snippet.description;
  else if (c.snippet?.localized?.description) desc = c.snippet.localized.description;
  else if (c.about) desc = c.about;
  else desc = ''; // empty string fallback

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
    descLen: desc ? desc.length : 0, // Add descLen for metrics
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

// AO Parent/Subcluster Pivot - Two-tier clustering system
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

  const debugRows = [];
  const parentMetrics = new Map();

  if (!Array.isArray(src)) {
    console.error('Source is not an array:', typeof src, src);
    return { clusters: [], debugRows: [] };
  }

  // STEP 1: Classify all channels with coarse parent heuristics
  const channelClassifications = new Map();

  for (const raw of src) {
    const ch = normalizeChannel(raw);
    if (!ch.id) {
      console.warn('Channel missing ID:', raw);
      continue;
    }

    let parent, why;
    if (ov[ch.id]) {
      parent = ov[ch.id];
      why = { method: 'override', label: parent };
    } else {
      const res = classifyChannel({ title: ch.title, desc: ch.desc, url: ch.url });
      parent = res.label || 'Unclassified';
      why = {
        method: 'heuristic',
        label: parent,
        bestScore: res.best.score,
        margin: res.best.score - res.runner.score,
        best: res.best,
        runner: res.runner,
        scores: res.scores
      };
    }

    channelClassifications.set(ch.id, { ch, parent, why });
  }

  console.log(`Classified ${channelClassifications.size} channels into parents`);

  // STEP 2: Group channels by parent
  const parentGroups = new Map();

  for (const [id, { ch, parent, why }] of channelClassifications) {
    if (!parentGroups.has(parent)) {
      parentGroups.set(parent, { parent, channels: [] });
    }
    parentGroups.get(parent).channels.push({ id, ch, why });
  }

  console.log(`Grouped into ${parentGroups.size} parent categories`);

  // STEP 3: For each parent, build TF-IDF vectors and run adaptive subclustering
  const allClusters = [];
  let totalSubclusters = 0;

  for (const [parentLabel, group] of parentGroups) {
    const N = group.channels.length;
    parentMetrics.set(parentLabel, { N, numSubclusters: 0, avgSize: 0, merged: 0 });

    if (N === 0) continue;

    console.log(`Processing parent "${parentLabel}" with ${N} channels`);

    // Adaptive subclustering rules
    let k, S_min, M_max;

    if (N < 10) {
      // No split - single cluster
      k = 1;
      S_min = N;
      M_max = 1;
    } else if (N <= 25) {
      // Try k=2, keep only if both >= S_min=6
      k = 2;
      S_min = 6;
      M_max = 2;
    } else if (N <= 60) {
      // k ≈ sqrt(N/8), min S=8, max 4 islands
      k = Math.round(Math.sqrt(N / 8));
      S_min = 8;
      M_max = 4;
    } else {
      // k ≈ sqrt(N/5), min S=10, max 6 islands
      k = Math.round(Math.sqrt(N / 5));
      S_min = 10;
      M_max = 6;
    }

    console.log(`Parent "${parentLabel}": N=${N}, k=${k}, S_min=${S_min}, M_max=${M_max}`);

    if (k === 1) {
      // Single cluster case
      const cluster = createClusterFromChannels(group.channels, parentLabel, 0, debug, channelClassifications);
      allClusters.push(cluster);
      parentMetrics.get(parentLabel).numSubclusters = 1;
      parentMetrics.get(parentLabel).avgSize = N;
      totalSubclusters += 1;
    } else {
      // Multi-cluster case - build subclusters
      const subclusters = await buildSubclusters(group.channels, parentLabel, k, S_min, M_max, debug, channelClassifications);

      // Filter out subclusters below minimum size
      const validSubclusters = subclusters.filter(sc => sc.channels.length >= S_min);

      // Merge subclusters that are too small or have poor separation
      const mergedSubclusters = await mergeSmallSubclusters(validSubclusters, S_min, debug);

      // Add parent field to each subcluster
      const finalSubclusters = mergedSubclusters.map((sc, index) => ({
        ...sc,
        parent: parentLabel,
        subclusterId: `${parentLabel.toLowerCase().replace(/\s+/g, '-')}-sub${index + 1}`
      }));

      allClusters.push(...finalSubclusters);

      const numSubclusters = finalSubclusters.length;
      const totalChannels = finalSubclusters.reduce((sum, sc) => sum + sc.channels.length, 0);
      const avgSize = numSubclusters > 0 ? totalChannels / numSubclusters : 0;
      const merged = subclusters.length - validSubclusters.length;

      parentMetrics.get(parentLabel).numSubclusters = numSubclusters;
      parentMetrics.get(parentLabel).avgSize = Math.round(avgSize);
      parentMetrics.get(parentLabel).merged = merged;
      totalSubclusters += numSubclusters;

      console.log(`Parent "${parentLabel}": ${numSubclusters} subclusters, avg size ${Math.round(avgSize)}, merged ${merged}`);
    }
  }

  // STEP 4: Create debug rows for all channels
  for (const [id, { ch, parent, why }] of channelClassifications) {
    if (debug) {
      debugRows.push({
        id: ch.id,
        title: ch.title,
        desc: ch.desc,
        url: ch.url,
        descLen: ch.desc ? ch.desc.length : 0,
        parent,
        label: parent, // For compatibility
        why
      });
    }
  }

  console.log('buildAutoOrganize returning:', {
    clustersCount: allClusters.length,
    debugRowsCount: debugRows.length,
    totalSubclusters,
    parentMetrics: Object.fromEntries(parentMetrics)
  });

  return { clusters: allClusters, debugRows, parentMetrics, totalSubclusters };
}

// Helper function to create a cluster from channels
function createClusterFromChannels(channels, parentLabel, subclusterIndex, debug, channelClassifications) {
  const channelItems = channels.map(({ id, ch, why }) => ({
    id: ch.id,
    title: ch.title,
    desc: ch.desc,
    thumb: ch.thumb,
    videoCount: ch.videoCount,
    size: sizeFromCount(ch.videoCount),
    ...(debug ? { why } : {})
  }));

  const channelIds = channels.map(({ id }) => id).sort();
  const buildParams = {
    heuristicsVersion: 3,
    minMargin: 0.35,
    subclustering: { enabled: true, parent: parentLabel }
  };

  const clusterIdInput = JSON.stringify({
    members: channelIds,
    parent: parentLabel,
    subclusterIndex,
    params: buildParams
  });
  const clusterId = stableHash(clusterIdInput);

  // Compute topTerms from cluster members
  const termWeights = new Map();

  for (const { id } of channels) {
    const ch = channelClassifications.get(id);
    if (ch && ch.ch) {
      const tokens = tokenize(`${ch.ch.title} ${ch.ch.desc}`);
      for (const [term, weight] of Object.entries(tokens)) {
        termWeights.set(term, (termWeights.get(term) || 0) + weight);
      }
    }
  }

  const topTerms = Array.from(termWeights.entries())
    .filter(([term]) => term.length >= 4 && !STOPWORDS.has(term))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term]) => term);

  // Compute exemplarId (first channel as exemplar for single clusters)
  const exemplarId = channels[0]?.id || channelIds[0];

  // Compute methodStats
  const methodStats = { heuristic: 0, tfidf: 0, override: 0 };
  for (const { id } of channels) {
    const ch = channelClassifications.get(id);
    if (ch && ch.why) {
      const method = ch.why.method;
      if (method === 'heuristic') methodStats.heuristic++;
      else if (method === 'tfidf') methodStats.tfidf++;
      else if (method === 'override') methodStats.override++;
    }
  }

  return {
    id: `${parentLabel.toLowerCase().replace(/\s+/g, '-')}${subclusterIndex > 0 ? `-sub${subclusterIndex}` : ''}`,
    label: parentLabel,
    parent: parentLabel,
    span: spanFromCount(channels.length),
    channels: channelItems,
    clusterId,
    topTerms,
    exemplarId,
    methodStats,
    buildParams,
    size: channels.length
  };
}

// Helper function to build subclusters using TF-IDF + cosine similarity
async function buildSubclusters(channels, parentLabel, k, S_min, M_max, debug, channelClassifications) {
  if (channels.length < 2 || k <= 1) {
    return [createClusterFromChannels(channels, parentLabel, 0, debug, channelClassifications)];
  }

  // Build TF-IDF vectors for subclustering
  const { vectors, documentFreq } = buildTfIdfVectors(channels.map(({ ch }) => ({ ...ch, label: parentLabel })));

  if (vectors.size < 2) {
    return [createClusterFromChannels(channels, parentLabel, 0, debug, channelClassifications)];
  }

  // Use k-means-like clustering with cosine similarity
  const subclusters = [];
  const usedChannels = new Set();

  for (let i = 0; i < Math.min(k, channels.length); i++) {
    // Pick a random unused channel as centroid
    const availableChannels = channels.filter(ch => !usedChannels.has(ch.id));
    if (availableChannels.length === 0) break;

    const centroidChannel = availableChannels[Math.floor(Math.random() * availableChannels.length)];
    usedChannels.add(centroidChannel.id);

    const centroidVector = tokenize(`${centroidChannel.ch.title} ${centroidChannel.ch.desc}`);

    // Find nearest neighbors to this centroid from remaining channels
    const similarities = [];
    for (const ch of channels) {
      if (ch.id !== centroidChannel.id && !usedChannels.has(ch.id)) {
        const targetVector = tokenize(`${ch.ch.title} ${ch.ch.desc}`);
        const similarity = cosineSimilarity(centroidVector, targetVector);
        similarities.push({ channel: ch, similarity });
      }
    }

    // Sort by similarity and take top channels for this subcluster
    similarities.sort((a, b) => b.similarity - a.similarity);

    // For first cluster, take higher number to ensure good coverage
    const takeCount = i === 0 ? Math.ceil(channels.length / k) + 2 : Math.ceil(channels.length / k);
    const subclusterChannels = [centroidChannel];

    for (const sim of similarities.slice(0, takeCount - 1)) {
      if (subclusterChannels.length < takeCount) {
        subclusterChannels.push(sim.channel);
        usedChannels.add(sim.channel.id);
      }
    }

    if (subclusterChannels.length >= S_min) {
      subclusters.push(createClusterFromChannels(subclusterChannels, parentLabel, i + 1, debug, channelClassifications));
    }
  }

  // Handle any remaining channels by adding them to existing subclusters or creating new ones
  const remainingChannels = channels.filter(ch => !usedChannels.has(ch.id));

  for (const remainingCh of remainingChannels) {
    // Find the most similar existing subcluster
    let bestSubcluster = null;
    let bestSimilarity = -1;

    for (const subcluster of subclusters) {
      if (subcluster.channels.length < 50) { // Limit subcluster size
        const subclusterVector = tokenize(
          subcluster.channels.map(ch => `${ch.title} ${ch.desc}`).join(' ')
        );
        const remainingVector = tokenize(`${remainingCh.ch.title} ${remainingCh.ch.desc}`);
        const similarity = cosineSimilarity(subclusterVector, remainingVector);

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestSubcluster = subcluster;
        }
      }
    }

    if (bestSubcluster && bestSimilarity > 0.1) {
      // Add to existing subcluster
      bestSubcluster.channels.push({
        id: remainingCh.ch.id,
        title: remainingCh.ch.title,
        desc: remainingCh.ch.desc,
        thumb: remainingCh.ch.thumb,
        videoCount: remainingCh.ch.videoCount,
        size: sizeFromCount(remainingCh.ch.videoCount),
        ...(debug ? { why: remainingCh.why } : {})
      });
      usedChannels.add(remainingCh.id);
    }
  }

  // Handle any still-remaining channels by creating a new subcluster
  const stillRemainingChannels = channels.filter(ch => !usedChannels.has(ch.id));
  if (stillRemainingChannels.length > 0) {
    subclusters.push(createClusterFromChannels(stillRemainingChannels, parentLabel, subclusters.length + 1, debug, channelClassifications));
  }

  return subclusters;
}

// Helper function to merge small subclusters
async function mergeSmallSubclusters(subclusters, S_min, debug) {
  if (subclusters.length <= 1) return subclusters;

  const validSubclusters = subclusters.filter(sc => sc.channels.length >= S_min);
  const smallSubclusters = subclusters.filter(sc => sc.channels.length < S_min);

  if (smallSubclusters.length === 0) return validSubclusters;

  // Merge small subclusters into the most similar valid subcluster
  for (const smallSC of smallSubclusters) {
    let bestMatch = null;
    let bestSimilarity = -1;

    // Build vectors for similarity comparison
    const { vectors: smallVectors } = buildTfIdfVectors(smallSC.channels.map(({ ch }) => ({ ...ch, label: smallSC.parent })));
    const { vectors: validVectors } = buildTfIdfVectors(validSubclusters.flatMap(sc =>
      sc.channels.map(({ ch }) => ({ ...ch, label: sc.parent }))
    ));

    for (let i = 0; i < validSubclusters.length; i++) {
      const validSC = validSubclusters[i];
      const { vectors: validSCVectors } = buildTfIdfVectors(validSC.channels.map(({ ch }) => ({ ...ch, label: validSC.parent })));

      // Compare small subcluster centroid with valid subcluster centroid
      const smallCentroid = calculateCentroid(smallVectors);
      const validCentroid = calculateCentroid(validSCVectors);

      if (smallCentroid && validCentroid) {
        const similarity = cosineSimilarity(smallCentroid, validCentroid);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = i;
        }
      }
    }

    if (bestMatch !== null && bestSimilarity > 0.15) {
      // Merge into best matching subcluster
      validSubclusters[bestMatch].channels.push(...smallSC.channels);
      if (debug) {
        console.log(`Merged small subcluster (${smallSC.channels.length} channels) into subcluster ${bestMatch + 1}`);
      }
    } else {
      // Add as separate subcluster if no good match found
      validSubclusters.push(smallSC);
    }
  }

  return validSubclusters;
}

// Helper function to calculate centroid vector
function calculateCentroid(vectors) {
  if (vectors.size === 0) return null;

  const centroid = {};
  let vectorCount = 0;

  for (const [id, { vector }] of vectors) {
    for (const [term, weight] of Object.entries(vector)) {
      centroid[term] = (centroid[term] || 0) + weight;
    }
    vectorCount++;
  }

  // Average the weights
  for (const term in centroid) {
    centroid[term] /= vectorCount;
  }

  return centroid;
}

// Write autoOrganize.meta.json with build information
async function writeAutoOrganizeMeta({ clusters, buildParams, parentMetrics } = {}) {
  if (!clusters || !Array.isArray(clusters)) {
    console.error('writeAutoOrganizeMeta: invalid clusters provided');
    return;
  }

  try {
    // Get all channel IDs from clusters
    const allChannelIds = new Set();
    for (const cluster of clusters) {
      if (cluster.channels) {
        for (const channel of cluster.channels) {
          if (channel.id) allChannelIds.add(channel.id);
        }
      }
    }

    const sortedChannelIds = Array.from(allChannelIds).sort();
    const channelFingerprint = stableHash(sortedChannelIds.join(','));

    // Calculate parent and subcluster metrics
    const parents = {};
    const subclustersByParent = new Map();

    for (const cluster of clusters) {
      const parent = cluster.parent || cluster.label;

      if (!parents[parent]) {
        parents[parent] = {
          count: 0,
          totalChannels: 0,
          subclusters: []
        };
      }

      parents[parent].count++;
      parents[parent].totalChannels += cluster.channels?.length || 0;
      parents[parent].subclusters.push({
        id: cluster.subclusterId || cluster.id,
        size: cluster.channels?.length || 0,
        clusterId: cluster.clusterId
      });

      if (!subclustersByParent.has(parent)) {
        subclustersByParent.set(parent, []);
      }
      subclustersByParent.get(parent).push(cluster);
    }

    // Calculate summary statistics
    const totalParents = Object.keys(parents).length;
    const totalSubclusters = clusters.length;
    const avgSubclustersPerParent = totalParents > 0 ? totalSubclusters / totalParents : 0;
    const largestParent = Object.entries(parents).reduce((max, [parent, data]) =>
      data.totalChannels > max.totalChannels ? { parent, ...data } : max,
      { parent: null, totalChannels: 0 }
    );

    const meta = {
      builtAt: new Date().toISOString(),
      buildVersion: 3,
      params: buildParams || {
        heuristicsVersion: 3,
        minMargin: 0.35,
        subclustering: {
          enabled: true,
          rules: {
            "N < 10": "single cluster",
            "10 ≤ N ≤ 25": "k=2, S_min=6, M_max=2",
            "25 < N ≤ 60": "k≈√(N/8), S_min=8, M_max=4",
            "N > 60": "k≈√(N/5), S_min=10, M_max=6"
          }
        }
      },
      channelFingerprint,
      summary: {
        totalChannels: allChannelIds.size,
        totalParents,
        totalSubclusters,
        avgSubclustersPerParent: Math.round(avgSubclustersPerParent * 10) / 10,
        largestParent: largestParent.parent ? {
          name: largestParent.parent,
          channels: largestParent.totalChannels,
          subclusters: largestParent.count
        } : null
      },
      parents,
      clusters: {
        count: clusters.length,
        idsSample: clusters.slice(0, 3).map(c => c.clusterId).filter(Boolean)
      }
    };

    const metaPath = resolveDataPath('autoOrganize.meta.json');
    await fsp.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');

    console.log(`[AO Meta] Written meta file: ${metaPath}`);
    console.log(`[AO Meta] Build info: ${allChannelIds.size} channels, ${totalParents} parents, ${totalSubclusters} subclusters`);
    console.log(`[AO Meta] Largest parent: ${largestParent.parent || 'N/A'} (${largestParent.totalChannels} channels, ${largestParent.count} subclusters)`);

    return meta;
  } catch (error) {
    console.error('Error writing autoOrganize meta:', error);
  }
}

export { buildAutoOrganize, loadChannels, loadOverrides, writeAutoOrganizeMeta };
