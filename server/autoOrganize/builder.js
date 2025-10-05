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

function jaccardSimilarity(setA, setB) {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function stem(word) {
  // Simple stemming - remove common suffixes
  return word.toLowerCase()
    .replace(/ing$/, '')
    .replace(/ed$/, '')
    .replace(/er$/, '')
    .replace(/est$/, '')
    .replace(/ly$/, '')
    .replace(/s$/, '');
}

// TF-IDF Parent Reassignment Function
async function performTfIdfParentReassignment(channelClassifications, debug) {
  const PARENT_SIM_MIN = 0.25;
  const MIN_MEMBERS_PER_PARENT = 5;

  // Gather unclassified channels with sufficient description length
  const unclassifiedChannels = [];
  const classifiedChannels = [];

  for (const [id, { ch, parent }] of channelClassifications) {
    if (parent === 'Unclassified' && ch.descLen >= 20) {
      unclassifiedChannels.push({ id, ch });
    } else if (parent !== 'Unclassified') {
      classifiedChannels.push({ id, ch, parent });
    }
  }

  if (unclassifiedChannels.length === 0) {
    console.log('[TF-IDF Reassign] No unclassified channels with sufficient description length');
    return 0;
  }

  console.log(`[TF-IDF Reassign] Processing ${unclassifiedChannels.length} unclassified channels (${classifiedChannels.length} classified)`);

  // Group classified channels by parent
  const parentGroups = new Map();
  for (const { id, ch, parent } of classifiedChannels) {
    if (!parentGroups.has(parent)) {
      parentGroups.set(parent, []);
    }
    parentGroups.get(parent).push({ id, ch });
  }

  // Filter parents with at least MIN_MEMBERS_PER_PARENT members
  const validParents = [];
  for (const [parent, channels] of parentGroups) {
    if (channels.length >= MIN_MEMBERS_PER_PARENT) {
      validParents.push(parent);
    } else {
      console.log(`[TF-IDF Reassign] Skipping parent "${parent}" - only ${channels.length} members (need ${MIN_MEMBERS_PER_PARENT})`);
    }
  }

  if (validParents.length === 0) {
    console.log('[TF-IDF Reassign] No parents with sufficient members for centroid calculation');
    return 0;
  }

  // Build TF-IDF vectors for all channels (both classified and unclassified)
  const allChannels = [...classifiedChannels, ...unclassifiedChannels];
  const { vectors, documentFreq } = buildTfIdfVectors(allChannels);

  // Compute parent centroids
  const parentCentroids = new Map();
  for (const parent of validParents) {
    const parentChannels = parentGroups.get(parent);
    const parentVectors = new Map();

    // Collect vectors for this parent
    for (const { id } of parentChannels) {
      if (vectors.has(id)) {
        parentVectors.set(id, vectors.get(id));
      }
    }

    // Calculate centroid
    const centroid = calculateCentroid(parentVectors);
    if (centroid) {
      parentCentroids.set(parent, centroid);
      console.log(`[TF-IDF Reassign] Computed centroid for "${parent}" (${parentChannels.length} channels)`);
    }
  }

  // Reassign unclassified channels
  let reassignedCount = 0;
  for (const { id, ch } of unclassifiedChannels) {
    const channelVector = vectors.get(id);
    if (!channelVector) continue;

    let bestParent = null;
    let bestSimilarity = -1;

    // Compare against all parent centroids
    for (const [parent, centroid] of parentCentroids) {
      const similarity = cosineSimilarity(channelVector.vector, centroid);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestParent = parent;
      }
    }

    // Reassign if similarity meets threshold
    if (bestParent && bestSimilarity >= PARENT_SIM_MIN) {
      const classification = channelClassifications.get(id);
      if (classification) {
        classification.parent = bestParent;
        classification.why = {
          method: 'tfidfParent',
          label: bestParent,
          parentSim: {
            best: bestSimilarity,
            parent: bestParent
          }
        };
        reassignedCount++;

        if (debug) {
          console.log(`[TF-IDF Reassign] Moved "${ch.title.substring(0, 50)}..." from Unclassified to "${bestParent}" (similarity: ${bestSimilarity.toFixed(3)})`);
        }
      }
    }
  }

  console.log(`[TF-IDF Reassign] Reassigned ${reassignedCount}/${unclassifiedChannels.length} channels`);
  return reassignedCount;
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

  // Build TF-IDF vectors for all channels
  for (const ch of channels) {
    const tokens = tokenize(`${ch.title} ${ch.desc}`);
    const vector = {};

    for (const [token, tf] of Object.entries(tokens)) {
      const df = documentFreq.get(token) || 1;
      const idf = Math.log(channels.length / df);
      vector[token] = tf * idf;
    }

    vectors.set(ch.id, { vector, label: ch.label });
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

  // STEP 2: TF-IDF Parent Reassignment Pass
  const tfidfReassigned = await performTfIdfParentReassignment(channelClassifications, debug);
  console.log(`TF-IDF reassignment: ${tfidfReassigned} channels moved from Unclassified`);

  // STEP 3: Group channels by parent
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

      // Merge near-duplicate subclusters by centroid similarity (>= 0.85 threshold)
      const similarityMergedSubclusters = await mergeNearDuplicateSubclusters(mergedSubclusters, parentLabel, debug);

      // Add parent field to each subcluster
      const finalSubclusters = similarityMergedSubclusters.map((sc, index) => ({
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

  // STEP 5: Semantic deduplication pass
  const dedupResult = await dedupSimilarClusters(allClusters, debug);
  const dedupedClusters = dedupResult.clusters;
  const mergedClustersSemantic = dedupResult.mergedCount;
  const dedupGroups = dedupResult.dedupGroups;

  // STEP 6: Ensure label uniqueness within parent scope
  const finalClusters = ensureParentLabelUniqueness(dedupedClusters, debug);

  // STEP 7: Apply discriminative labeling
  const discriminativelyLabeledClusters = await applyDiscriminativeLabeling(finalClusters, debug);

  console.log('buildAutoOrganize returning:', {
    clustersCount: discriminativelyLabeledClusters.length,
    debugRowsCount: debugRows.length,
    totalSubclusters,
    mergedClustersSemantic,
    parentMetrics: Object.fromEntries(parentMetrics)
  });

  return {
    clusters: discriminativelyLabeledClusters,
    debugRows,
    parentMetrics,
    totalSubclusters,
    mergedClustersSemantic,
    dedupGroups
  };
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

  // Create canonicalized label with sorted, capitalized terms
  const sortedTerms = (topTerms || []).slice(0, 2).map(t => t.trim()).sort();
  const labelTerms = sortedTerms.map(t => t.charAt(0).toUpperCase() + t.slice(1));
  const enrichedLabel = `${parentLabel} • ${labelTerms.join(' • ')}`.trim();

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
    label: enrichedLabel,
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

// Helper function to merge near-duplicate subclusters by centroid similarity
async function mergeNearDuplicateSubclusters(subclusters, parentLabel, debug) {
  if (subclusters.length <= 1) return subclusters;

  const mergedClusters = [];
  const usedIndices = new Set();
  let mergedCount = 0;

  for (let i = 0; i < subclusters.length; i++) {
    if (usedIndices.has(i)) continue;

    const clusterA = subclusters[i];
    let mergedCluster = { ...clusterA };
    const mergedIndices = [i];

    // Find all similar subclusters to merge with clusterA
    for (let j = i + 1; j < subclusters.length; j++) {
      if (usedIndices.has(j)) continue;

      const clusterB = subclusters[j];

      // Only merge subclusters from the same parent
      if (clusterA.parent !== clusterB.parent) continue;

      // Calculate centroid similarity
      const { vectors: vectorsA } = buildTfIdfVectors(
        mergedCluster.channels.map(({ ch }) => ({ ...ch, label: parentLabel }))
      );
      const { vectors: vectorsB } = buildTfIdfVectors(
        clusterB.channels.map(({ ch }) => ({ ...ch, label: parentLabel }))
      );

      const centroidA = calculateCentroid(vectorsA);
      const centroidB = calculateCentroid(vectorsB);

      if (centroidA && centroidB) {
        const similarity = cosineSimilarity(centroidA, centroidB);

        if (similarity >= 0.85) {
          // Merge clusterB into mergedCluster
          mergedCluster.channels.push(...clusterB.channels);
          mergedCluster.size += clusterB.size;
          mergedIndices.push(j);
          usedIndices.add(j);
          mergedCount++;

          if (debug) {
            console.log(`[Merge Pass] Merged subcluster ${j + 1} into ${i + 1} (similarity: ${similarity.toFixed(3)})`);
          }
        }
      }
    }

    // Mark as merged if we actually merged something
    if (mergedIndices.length > 1) {
      mergedCluster._merged = true;
      mergedCluster._mergedFrom = mergedIndices.length;
    }

    mergedClusters.push(mergedCluster);
    usedIndices.add(i);
  }

  if (debug && mergedCount > 0) {
    console.log(`[Merge Pass] Merged ${mergedCount} subclusters into ${mergedClusters.length} final clusters`);
  }

  return mergedClusters;
}

// Semantic deduplication function - dedupSimilarClusters
async function dedupSimilarClusters(clusters, debug) {
  if (clusters.length <= 1) {
    return { clusters, mergedCount: 0, dedupGroups: [] };
  }

  console.log(`[Semantic Dedup] Starting with ${clusters.length} clusters`);

  // Group clusters by parent category using canonical keys
  const parentGroups = new Map();

  for (const cluster of clusters) {
    const parent = cluster.parent || 'Unclassified';
    const topTerms = cluster.topTerms || [];

    // Build canonical key: parent + sorted(stem(topTerms.slice(0,4))).join(',')
    const stemmedTerms = topTerms.slice(0, 4).map(term => stem(term)).sort();
    const canonicalKey = `${parent}|${stemmedTerms.join(',')}`;

    if (!parentGroups.has(canonicalKey)) {
      parentGroups.set(canonicalKey, {
        key: canonicalKey,
        parent,
        clusters: []
      });
    }
    parentGroups.get(canonicalKey).clusters.push(cluster);
  }

  const dedupGroups = [];
  const finalClusters = [];
  let mergedCount = 0;

  // Process each group
  for (const [key, group] of parentGroups) {
    if (group.clusters.length <= 1) {
      // No duplicates, keep as is
      finalClusters.push(...group.clusters);
      continue;
    }

    console.log(`[Semantic Dedup] Processing group "${key}" with ${group.clusters.length} clusters`);

    // For groups with multiple clusters, find similar pairs and merge
    const clustersToProcess = [...group.clusters];
    const processedIndices = new Set();

    for (let i = 0; i < clustersToProcess.length; i++) {
      if (processedIndices.has(i)) continue;

      const clusterA = clustersToProcess[i];
      let mergedCluster = { ...clusterA };
      const mergedIndices = [i];
      const mergeDetails = [];

      // Find similar clusters to merge with clusterA
      for (let j = i + 1; j < clustersToProcess.length; j++) {
        if (processedIndices.has(j)) continue;

        const clusterB = clustersToProcess[j];

        // Calculate cosine similarity of centroids
        const { vectors: vectorsA } = buildTfIdfVectors(
          clusterA.channels.map(({ ch }) => ({ ...ch, label: clusterA.parent }))
        );
        const { vectors: vectorsB } = buildTfIdfVectors(
          clusterB.channels.map(({ ch }) => ({ ...ch, label: clusterB.parent }))
        );

        const centroidA = calculateCentroid(vectorsA);
        const centroidB = calculateCentroid(vectorsB);

        let cosineSim = 0;
        if (centroidA && centroidB) {
          cosineSim = cosineSimilarity(centroidA, centroidB);
        }

        // Calculate Jaccard overlap of topTerms[0..5]
        const topTermsA = new Set((clusterA.topTerms || []).slice(0, 5));
        const topTermsB = new Set((clusterB.topTerms || []).slice(0, 5));
        const jaccardSim = jaccardSimilarity(topTermsA, topTermsB);

        // Merge if either similarity threshold is met
        if (cosineSim >= 0.80 || jaccardSim >= 0.6) {
          console.log(`[Semantic Dedup] Merging clusters: "${clusterA.label}" + "${clusterB.label}" (cosine: ${cosineSim.toFixed(3)}, jaccard: ${jaccardSim.toFixed(3)})`);

          // Merge clusterB into mergedCluster
          mergedCluster.channels.push(...clusterB.channels);
          mergedCluster.size += clusterB.size;
          mergedIndices.push(j);
          processedIndices.add(j);
          mergedCount++;

          // Record merge details for debug
          mergeDetails.push({
            mergedLabel: clusterB.label,
            cosineSim,
            jaccardSim
          });

          // Recompute topTerms for merged cluster
          const allChannels = mergedCluster.channels;
          const termWeights = new Map();

          for (const { ch } of allChannels) {
            if (ch) {
              const tokens = tokenize(`${ch.title} ${ch.desc}`);
              for (const [term, weight] of Object.entries(tokens)) {
                termWeights.set(term, (termWeights.get(term) || 0) + weight);
              }
            }
          }

          mergedCluster.topTerms = Array.from(termWeights.entries())
            .filter(([term]) => term.length >= 4 && !STOPWORDS.has(term))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([term]) => term);

          // Update label with new topTerms
          const sortedTerms = (mergedCluster.topTerms || []).slice(0, 2).map(t => t.trim()).sort();
          const labelTerms = sortedTerms.map(t => t.charAt(0).toUpperCase() + t.slice(1));
          mergedCluster.label = `${mergedCluster.parent} • ${labelTerms.join(' • ')}`.trim();

          // Mark as merged
          mergedCluster._merged = true;
          mergedCluster._mergedFrom = mergedIndices.length;
        }
      }

      // Record dedup group for debug
      if (mergeDetails.length > 0) {
        dedupGroups.push({
          parent: group.parent,
          originalLabels: [clusterA.label, ...mergeDetails.map(d => d.mergedLabel)],
          finalLabel: mergedCluster.label,
          cosineSims: mergeDetails.map(d => d.cosineSim),
          jaccardSims: mergeDetails.map(d => d.jaccardSim),
          mergedCount: mergedIndices.length
        });
      }

      finalClusters.push(mergedCluster);
      processedIndices.add(i);
    }
  }

  console.log(`[Semantic Dedup] Completed: ${mergedCount} merges, ${finalClusters.length} final clusters`);

  return {
    clusters: finalClusters,
    mergedCount,
    dedupGroups
  };
}

// Parent-scope uniqueness rule function
function ensureParentLabelUniqueness(clusters, debug) {
  if (clusters.length <= 1) return clusters;

  // Group clusters by parent
  const parentGroups = new Map();

  for (const cluster of clusters) {
    const parent = cluster.parent || 'Unclassified';
    if (!parentGroups.has(parent)) {
      parentGroups.set(parent, []);
    }
    parentGroups.get(parent).push(cluster);
  }

  const finalClusters = [];

  for (const [parent, parentClusters] of parentGroups) {
    if (parentClusters.length <= 1) {
      finalClusters.push(...parentClusters);
      continue;
    }

    // Check for duplicate labels within this parent
    const labelCounts = new Map();
    for (const cluster of parentClusters) {
      const label = cluster.label;
      labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
    }

    const duplicateLabels = new Set();
    for (const [label, count] of labelCounts) {
      if (count > 1) {
        duplicateLabels.add(label);
      }
    }

    if (duplicateLabels.size === 0) {
      // No duplicates, keep as is
      finalClusters.push(...parentClusters);
      continue;
    }

    console.log(`[Parent Uniqueness] Resolving ${duplicateLabels.size} duplicate labels in parent "${parent}"`);

    // Resolve duplicates by adding discriminative terms or suffixes
    const processedClusters = new Map(); // label -> cluster

    for (const cluster of parentClusters) {
      const originalLabel = cluster.label;

      if (!duplicateLabels.has(originalLabel)) {
        // Not a duplicate, keep as is
        processedClusters.set(originalLabel, cluster);
        continue;
      }

      // This is a duplicate label, need to make it unique
      let uniqueLabel = originalLabel;
      let attempts = 0;
      const maxAttempts = 3;

      while (processedClusters.has(uniqueLabel) && attempts < maxAttempts) {
        attempts++;

        if (attempts === 1) {
          // First attempt: add next discriminative term (topTerms[2] or [3])
          const topTerms = cluster.topTerms || [];
          const nextTerms = topTerms.slice(2, 4); // indices 2 and 3

          if (nextTerms.length > 0) {
            const sortedTerms = nextTerms.map(t => t.trim()).sort();
            const labelTerms = sortedTerms.map(t => t.charAt(0).toUpperCase() + t.slice(1));
            uniqueLabel = `${parent} • ${labelTerms.join(' • ')}`.trim();
          }
        } else if (attempts === 2) {
          // Second attempt: try topTerms[4] or [5]
          const topTerms = cluster.topTerms || [];
          const nextTerms = topTerms.slice(4, 6); // indices 4 and 5

          if (nextTerms.length > 0) {
            const sortedTerms = nextTerms.map(t => t.trim()).sort();
            const labelTerms = sortedTerms.map(t => t.charAt(0).toUpperCase() + t.slice(1));
            uniqueLabel = `${parent} • ${labelTerms.join(' • ')}`.trim();
          }
        } else {
          // Final attempt: add suffix
          uniqueLabel = `${originalLabel} • Alt`;
        }
      }

      // If still colliding after all attempts, add V2, V3, etc.
      let counter = 2;
      let baseLabel = uniqueLabel;
      while (processedClusters.has(uniqueLabel)) {
        uniqueLabel = `${baseLabel} • V${counter}`;
        counter++;
      }

      // Update cluster label
      cluster.label = uniqueLabel;
      processedClusters.set(uniqueLabel, cluster);

      if (debug) {
        console.log(`[Parent Uniqueness] Changed "${originalLabel}" to "${uniqueLabel}"`);
      }
    }

    finalClusters.push(...Array.from(processedClusters.values()));
  }

  return finalClusters;
}

// Discriminative labeling function
async function applyDiscriminativeLabeling(clusters, debug) {
  if (clusters.length === 0) return clusters;

  // Build parent corpus for TF-IDF calculation
  const parentCorpora = new Map();

  for (const cluster of clusters) {
    const parent = cluster.parent || 'Unclassified';
    if (!parentCorpora.has(parent)) {
      parentCorpora.set(parent, []);
    }
    parentCorpora.get(parent).push(...cluster.channels.map(({ ch }) => ({ ...ch, label: parent })));
  }

  const finalClusters = [];

  for (const cluster of clusters) {
    const parent = cluster.parent || 'Unclassified';
    const parentChannels = parentCorpora.get(parent) || [];

    if (parentChannels.length === 0) {
      finalClusters.push(cluster);
      continue;
    }

    // Build TF-IDF vectors for the parent corpus
    const { vectors: parentVectors, documentFreq } = buildTfIdfVectors(parentChannels);

    // Calculate TF-IDF weights for this cluster's topTerms
    const topTerms = cluster.topTerms || [];
    const termWeights = new Map();

    for (const term of topTerms) {
      // Calculate TF for this term in this cluster
      let tf = 0;
      for (const { ch } of cluster.channels) {
        if (ch) {
          const tokens = tokenize(`${ch.title} ${ch.desc}`);
          tf += tokens[term] || 0;
        }
      }

      // Calculate IDF from parent corpus
      const df = documentFreq.get(term) || 1;
      const idf = Math.log(parentChannels.length / df);

      termWeights.set(term, tf * idf);
    }

    // Select top 2 discriminative terms (highest TF-IDF weights)
    const discriminativeTerms = Array.from(termWeights.entries())
      .filter(([term]) => term.length >= 4 && !STOPWORDS.has(term))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([term]) => term);

    if (discriminativeTerms.length >= 2) {
      // Create new discriminative label
      const sortedTerms = discriminativeTerms.map(t => t.trim()).sort();
      const labelTerms = sortedTerms.map(t => t.charAt(0).toUpperCase() + t.slice(1));
      const newLabel = `${parent} • ${labelTerms.join(' • ')}`.trim();

      if (debug) {
        console.log(`[Discriminative Labeling] Changed "${cluster.label}" to "${newLabel}" (terms: ${discriminativeTerms.join(', ')})`);
      }

      cluster.label = newLabel;
    }

    finalClusters.push(cluster);
  }

  return finalClusters;
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

    // Calculate merge pass statistics
    const mergedClusters = clusters.filter(c => c._merged).length;
    const canonicalizedLabels = clusters.filter(c => {
      // Check if label has canonicalized format (sorted, capitalized terms)
      const parts = c.label.split(' • ');
      if (parts.length >= 3) { // Parent + at least 2 terms
        const terms = parts.slice(1);
        // Check if terms are properly capitalized and sorted
        return terms.every(term =>
          term === term.charAt(0).toUpperCase() + term.slice(1).toLowerCase()
        );
      }
      return false;
    }).length;

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
      parentReassign: {
        minMembersPerParent: 5,
        similarityMin: 0.25
      },
      mergePass: {
        threshold: 0.85,
        merged: mergedClusters
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
