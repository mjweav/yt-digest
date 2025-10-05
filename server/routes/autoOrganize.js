// server/routes/autoOrganize.js (ES Module)
import express from 'express';
import fs from 'fs';
import path from 'path';
import { buildAutoOrganize, loadChannels, loadOverrides, writeAutoOrganizeMeta } from '../autoOrganize/builder.js';
import * as store from '../data/categoriesStore.js';
import { resolveDataPath } from '../utils/paths.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const debug = req.query.debug === '1';
    const channels = await loadChannels();
    const overrides = await loadOverrides();
    const { clusters, debugRows } = await buildAutoOrganize({ channels, overrides, debug });

    // merge assignments
    const assigns = await store.getAssignments();
    const merged = {
      builtAt: new Date().toISOString(),
      clusters: (Array.isArray(clusters) ? clusters : []).map(c => ({
        ...c,
        channels: c.channels.map(ch => ({
          ...ch,
          cats: Array.isArray(assigns[ch.id]) ? assigns[ch.id] : []
        }))
      }))
    };

    if (debug) {
      // Enhanced debug summary logging
      const byLabel = new Map();
      const byMethod = new Map();
      const unclassifiedRows = [];
      let totalDescLen = 0;
      let zeroDescCount = 0;

      for (const r of debugRows) {
        const label = r.label || 'Unclassified';
        byLabel.set(label, (byLabel.get(label) || 0) + 1);

        if (r.why?.method) {
          byMethod.set(r.why.method, (byMethod.get(r.why.method) || 0) + 1);
        }

        if (label === 'Unclassified') {
          unclassifiedRows.push(r);
        }

        // Calculate hydration metrics
        const descLen = r.descLen || 0;
        totalDescLen += descLen;
        if (descLen === 0) {
          zeroDescCount++;
        }
      }

      const sortedLabels = [...byLabel.entries()].sort((a,b)=>b[1]-a[1]);
      const sortedMethods = [...byMethod.entries()].sort((a,b)=>b[1]-a[1]);

      console.log('[AO DEBUG] totals:', {
        rows: debugRows.length,
        labels: sortedLabels,
        methods: sortedMethods
      });

      // Sample unclassified titles for debugging
      const unclsSamples = unclassifiedRows.slice(0,5);
      console.log('[AO DEBUG] samples (Unclassified):', unclsSamples.map(u => ({
        title: u.title.substring(0, 80),
        descLen: u.descLen,
        method: u.why?.method || 'unknown'
      })));

      // Build compact debug structure
      const debugSummary = {
        when: merged.builtAt,
        summary: {
          total: debugRows.length,
          byLabel: Object.fromEntries(sortedLabels),
          byMethod: Object.fromEntries(sortedMethods),
          unclassified: byLabel.get('Unclassified') || 0
        },
        hydration: {
          total: debugRows.length,
          zeroDesc: zeroDescCount,
          avgDescLen: debugRows.length > 0 ? (totalDescLen / debugRows.length).toFixed(1) : 0
        },
        samples: {
          unclassified: unclassifiedRows.slice(0, 8).map(r => ({
            title: r.title.substring(0, 160),
            descLen: r.descLen,
            method: r.why?.method || 'unknown'
          }))
        }
      };

      const p = resolveDataPath('autoOrganize.debug.json');
      try {
        fs.writeFileSync(p, JSON.stringify(debugSummary, null, 2), 'utf8');
        console.log(`[AO DEBUG] Written debug file: ${p}`);
      } catch (e) {
        console.error('Failed to write debug file:', e);
      }

      // Add parent/subcluster metrics to debug response
      const parentMetrics = {};
      const subclusterSummary = {};

      for (const cluster of clusters) {
        const parent = cluster.parent || cluster.label;

        if (!parentMetrics[parent]) {
          parentMetrics[parent] = {
            subclusters: 0,
            totalChannels: 0,
            sizes: []
          };
        }

        parentMetrics[parent].subclusters++;
        parentMetrics[parent].totalChannels += cluster.channels?.length || 0;
        parentMetrics[parent].sizes.push(cluster.channels?.length || 0);
      }

      // Calculate subcluster statistics per parent
      for (const [parent, metrics] of Object.entries(parentMetrics)) {
        const sizes = metrics.sizes;
        subclusterSummary[parent] = {
          subclusters: metrics.subclusters,
          totalChannels: metrics.totalChannels,
          avgSize: sizes.length > 0 ? Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length) : 0,
          minSize: sizes.length > 0 ? Math.min(...sizes) : 0,
          maxSize: sizes.length > 0 ? Math.max(...sizes) : 0
        };
      }

      // Calculate unique labels and duplicates
      const labelCounts = new Map();
      for (const cluster of clusters) {
        const label = cluster.label;
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
      }

      const uniqueLabels = labelCounts.size;
      const duplicateLabels = clusters.length - uniqueLabels;

      // Calculate merge metrics
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

      return res.json({
        ...merged,
        debug: {
          file: 'data/autoOrganize.debug.json',
          summary: debugSummary.summary,
          samples: debugSummary.samples,
          parents: {
            count: Object.keys(parentMetrics).length,
            metrics: parentMetrics,
            subclusterSummary
          },
          labels: {
            uniqueLabels,
            duplicateLabels
          },
          merges: {
            mergedClusters,
            canonicalizedLabels
          },
          cache: {
            clusterCount: clusters.length,
            clusterIds: clusters.slice(0, 3).map(c => c.clusterId),
            builtAt: merged.builtAt
          }
        }
      });
    }

    return res.json(merged);
  } catch (e) {
    console.error('GET /api/auto-organize error', e);
    res.status(500).json({ error: 'Failed to build auto-organize view' });
  }
});

router.post('/recompute', async (_req, res) => {
  try {
    const channels = await loadChannels();
    const overrides = await loadOverrides();
    const { clusters } = await buildAutoOrganize({ channels, overrides, debug: false });
    const builtAt = new Date().toISOString();

    // Write cache to data/autoOrganize.json for parity
    const p = resolveDataPath('autoOrganize.json');
    fs.writeFileSync(p, JSON.stringify({ builtAt, clusters }, null, 2), 'utf8');

    // Write meta.json with build information
    const buildParams = clusters.length > 0 ? clusters[0].buildParams : null;
    await writeAutoOrganizeMeta({ clusters, buildParams });

    return res.json({ ok: true, builtAt, clusters: clusters.length });
  } catch (e) {
    console.error('POST /api/auto-organize/recompute error', e);
    res.status(500).json({ error: 'recompute failed' });
  }
});

// Add meta route to serve autoOrganize.meta.json
router.get('/meta', async (_req, res) => {
  try {
    const metaPath = resolveDataPath('autoOrganize.meta.json');

    try {
      const meta = fs.readFileSync(metaPath, 'utf8');
      return res.json(JSON.parse(meta));
    } catch (fileError) {
      // Return 404 if meta file doesn't exist
      return res.status(404).json({ error: 'Meta file not found. Run recompute first.' });
    }
  } catch (e) {
    console.error('GET /api/auto-organize/meta error', e);
    res.status(500).json({ error: 'Failed to read meta file' });
  }
});

// explicit debug export
router.post('/debug/export', async (_req, res) => {
  try {
    const channels = await loadChannels();
    const overrides = await loadOverrides();
    const { debugRows } = await buildAutoOrganize({ channels, overrides, debug: true });
    const when = new Date().toISOString();
    const p = resolveDataPath('autoOrganize.debug.json');
    fs.writeFileSync(p, JSON.stringify({ when, rows: debugRows }, null, 2), 'utf8');
    res.json({ ok: true, file: 'data/autoOrganize.debug.json', rows: debugRows.length });
  } catch (e) {
    console.error('POST /api/auto-organize/debug/export error', e);
    res.status(500).json({ error: 'debug export failed' });
  }
});

export default router;
