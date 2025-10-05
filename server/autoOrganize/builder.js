import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { classifyChannel } from './heuristics2.js';
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

  // First pass: classify all channels with heuristics
  const channelClassifications = new Map();

  for (const raw of src) {
    const ch = normalizeChannel(raw);
    if (!ch.id) {
      console.warn('Channel missing ID:', raw);
      continue;
    }

    let label, why;
    if (ov[ch.id]) {
      label = ov[ch.id];
      why = { method: 'override', label };
    } else {
      const res = classifyChannel({ title: ch.title, desc: ch.desc, url: ch.url });
      label = res.label || 'Unclassified';
      why = {
        method: 'heuristic',
        label,
        bestScore: res.best.score,
        margin: res.best.score - res.runner.score,
        best: res.best,
        runner: res.runner,
        scores: res.scores
      };
    }

    channelClassifications.set(ch.id, { ch, label, why });
  }

  // Build TF-IDF vectors from classified channels only
  const { vectors, documentFreq } = buildTfIdfVectors(Array.from(channelClassifications.values())
    .map(({ ch, label }) => ({ ...ch, label })));

  console.log(`Built TF-IDF vectors for ${vectors.size} classified channels`);

  // Second pass: apply TF-IDF fallback for low-confidence classifications
  for (const [id, { ch, label: initialLabel, why: initialWhy }] of channelClassifications) {
    let finalLabel = initialLabel;
    let finalWhy = initialWhy;

    // Apply TF-IDF fallback for Unclassified or low-confidence items
    if (initialLabel === 'Unclassified' || initialWhy.bestScore <= 0 ||
        (initialWhy.bestScore - initialWhy.runner?.score < 0.35)) {

      const targetVector = tokenize(`${ch.title} ${ch.desc}`);

      if (Object.keys(targetVector).length > 0 && vectors.size > 0) {
        const neighbors = findNearestNeighbors(targetVector, vectors, 12);

        if (neighbors.length > 0) {
          // Count votes per category
          const voteCounts = new Map();
          let maxVotes = 0;
          let topCategory = null;

          for (const neighbor of neighbors) {
            const votes = (voteCounts.get(neighbor.label) || 0) + 1;
            voteCounts.set(neighbor.label, votes);
            if (votes > maxVotes) {
              maxVotes = votes;
              topCategory = neighbor.label;
            }
          }

          // Apply fallback if we have enough votes and similarity threshold (relaxed for better coverage)
          if (maxVotes >= 3 && neighbors[0].similarity >= 0.15) {
            finalLabel = topCategory;
            finalWhy = {
              method: 'tfidf',
              label: finalLabel,
              topSim: neighbors[0].similarity,
              neighborVotes: maxVotes,
              totalNeighbors: neighbors.length
            };
            console.log(`TF-IDF fallback: ${ch.title} -> ${finalLabel} (sim: ${neighbors[0].similarity.toFixed(3)}, votes: ${maxVotes})`);
          }
        }
      }
    }

    if (!clustersMap.has(finalLabel)) clustersMap.set(finalLabel, { label: finalLabel, items: [] });
    clustersMap.get(finalLabel).items.push({
      id: ch.id,
      title: ch.title,
      desc: ch.desc,
      thumb: ch.thumb,
      videoCount: ch.videoCount,
      size: sizeFromCount(ch.videoCount),
      ...(debug ? { why: finalWhy } : {})
    });

    if (debug) {
      debugRows.push({
        id: ch.id,
        title: ch.title,
        desc: ch.desc,
        url: ch.url,
        descLen: ch.desc ? ch.desc.length : 0,
        label: finalLabel,
        why: finalWhy
      });
    }
  }

  // Enhanced cluster creation with stable IDs, topTerms, exemplarId, and methodStats
  const clusters = Array.from(clustersMap.values()).map(c => {
    const channelIds = c.items.map(item => item.id).sort();
    const buildParams = {
      heuristicsVersion: 2, // Track heuristics version
      minMargin: 0.35,
      tfidf: { k: 12, votes: 3, sim: 0.15 }
    };

    // Compute stable clusterId
    const clusterIdInput = JSON.stringify({
      members: channelIds,
      params: buildParams
    });
    const clusterId = stableHash(clusterIdInput);

    // Compute topTerms from cluster members
    const clusterVectors = new Map();
    const termWeights = new Map();

    for (const item of c.items) {
      const ch = channelClassifications.get(item.id);
      if (ch && ch.ch) {
        const tokens = tokenize(`${ch.ch.title} ${ch.ch.desc}`);
        for (const [term, weight] of Object.entries(tokens)) {
          termWeights.set(term, (termWeights.get(term) || 0) + weight);
        }
      }
    }

    // Get top terms (6-12 terms), excluding stopwords and short tokens
    const topTerms = Array.from(termWeights.entries())
      .filter(([term]) => term.length >= 4 && !STOPWORDS.has(term))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term]) => term);

    // Compute exemplarId (closest to centroid)
    let exemplarId = channelIds[0]; // fallback to first
    if (c.items.length > 1) {
      // Build cluster centroid from TF-IDF vectors
      const centroid = {};
      let vectorCount = 0;

      for (const item of c.items) {
        const ch = channelClassifications.get(item.id);
        if (ch && ch.ch) {
          const tokens = tokenize(`${ch.ch.title} ${ch.ch.desc}`);
          for (const [term, tf] of Object.entries(tokens)) {
            if (term.length >= 3 && !STOPWORDS.has(term)) {
              const idf = Math.log(src.length / (documentFreq.get(term) || 1));
              centroid[term] = (centroid[term] || 0) + (tf * idf);
            }
          }
          vectorCount++;
        }
      }

      // Average the centroid
      for (const term in centroid) {
        centroid[term] /= vectorCount;
      }

      // Find closest channel to centroid
      let maxSimilarity = -1;
      for (const item of c.items) {
        const ch = channelClassifications.get(item.id);
        if (ch && ch.ch) {
          const tokens = tokenize(`${ch.ch.title} ${ch.ch.desc}`);
          const channelVector = {};
          for (const [term, tf] of Object.entries(tokens)) {
            if (term.length >= 3 && !STOPWORDS.has(term)) {
              const idf = Math.log(src.length / (documentFreq.get(term) || 1));
              channelVector[term] = tf * idf;
            }
          }

          const similarity = cosineSimilarity(centroid, channelVector);
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            exemplarId = item.id;
          }
        }
      }
    }

    // Compute methodStats
    const methodStats = { heuristic: 0, tfidf: 0, override: 0 };
    for (const item of c.items) {
      const ch = channelClassifications.get(item.id);
      if (ch && ch.why) {
        const method = ch.why.method;
        if (method === 'heuristic') methodStats.heuristic++;
        else if (method === 'tfidf') methodStats.tfidf++;
        else if (method === 'override') methodStats.override++;
      }
    }

    return {
      id: c.label.toLowerCase().replace(/\s+/g, '-'),
      label: c.label,
      span: spanFromCount(c.items.length),
      channels: c.items,
      clusterId,
      topTerms,
      exemplarId,
      methodStats,
      buildParams
    };
  });

  console.log('buildAutoOrganize returning:', {
    clustersCount: clusters.length,
    debugRowsCount: debugRows.length
  });

  return { clusters, debugRows };
}

// Write autoOrganize.meta.json with build information
async function writeAutoOrganizeMeta({ clusters, buildParams } = {}) {
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

    const meta = {
      builtAt: new Date().toISOString(),
      buildVersion: 3,
      params: buildParams || {
        heuristicsVersion: 2,
        minMargin: 0.35,
        tfidf: { k: 12, votes: 3, sim: 0.15 }
      },
      channelFingerprint,
      clusters: {
        count: clusters.length,
        idsSample: clusters.slice(0, 3).map(c => c.clusterId).filter(Boolean)
      }
    };

    const metaPath = resolveDataPath('autoOrganize.meta.json');
    await fsp.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');

    console.log(`[AO Meta] Written meta file: ${metaPath}`);
    console.log(`[AO Meta] Build info: ${clusters.length} clusters, fingerprint: ${channelFingerprint.substring(0, 8)}...`);

    return meta;
  } catch (error) {
    console.error('Error writing autoOrganize meta:', error);
  }
}

export { buildAutoOrganize, loadChannels, loadOverrides, writeAutoOrganizeMeta };
