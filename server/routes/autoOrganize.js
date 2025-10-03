import express from 'express';
const router = express.Router();
import { buildAutoOrganize, readCached } from '../autoOrganize/builder.js';

/** GET /api/auto-organize */
router.get('/', async (_req, res) => {
  try {
    const data = await readCached() || await buildAutoOrganize({ force: true });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to build auto-organize view' });
  }
});

/** POST /api/auto-organize/recompute */
router.post('/recompute', async (_req, res) => {
  try {
    const data = await buildAutoOrganize({ force: true });
    res.json({ ok: true, builtAt: data.builtAt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Recompute failed' });
  }
});

/** POST /api/categories/bulk-assign */
router.post('/bulk-assign', async (req, res) => {
  try {
    const { channelIds, category } = req.body;

    if (!Array.isArray(channelIds) || !category) {
      return res.status(400).json({
        error: 'channelIds (array) and category (string) are required'
      });
    }

    // For spike: log payload and return success
    console.log('Bulk assign request:', { channelIds, category, count: channelIds.length });

    // TODO: Integrate with existing category persistence when available
    // For now, just log and return success
    res.json({
      ok: true,
      count: channelIds.length,
      message: 'Categories assigned successfully (spike implementation)'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Bulk assign failed' });
  }
});

export default router;
