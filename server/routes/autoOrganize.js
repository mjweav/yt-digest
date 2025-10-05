// server/routes/autoOrganize.js (ES Module)
import express from 'express';
import fs from 'fs';
import path from 'path';
import { buildAutoOrganize, loadChannels, loadOverrides } from '../autoOrganize/builder.js';
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

      for (const r of debugRows) {
        const label = r.label || 'Unclassified';
        byLabel.set(label, (byLabel.get(label) || 0) + 1);

        if (r.why?.method) {
          byMethod.set(r.why.method, (byMethod.get(r.why.method) || 0) + 1);
        }

        if (label === 'Unclassified') {
          unclassifiedRows.push(r);
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

      return res.json({
        ...merged,
        debug: {
          file: 'data/autoOrganize.debug.json',
          summary: debugSummary.summary,
          samples: debugSummary.samples
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

    // optional: write cache to data/autoOrganize.json for parity
    const p = resolveDataPath('autoOrganize.json');
    fs.writeFileSync(p, JSON.stringify({ builtAt, clusters }, null, 2), 'utf8');

    return res.json({ ok: true, builtAt, clusters: clusters.length });
  } catch (e) {
    console.error('POST /api/auto-organize/recompute error', e);
    res.status(500).json({ error: 'recompute failed' });
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
