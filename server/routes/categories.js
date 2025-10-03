import express from 'express';
const router = express.Router();
import * as store from '../data/categoriesStore.js';

router.get('/', async (_req, res) => {
  try {
    const categories = await store.getCategories();
    res.json({ categories });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to read categories' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name required' });
    }
    const cats = await store.createCategory(name.trim());
    res.json({ ok: true, categories: cats });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to create category' });
  }
});

router.post('/bulk-assign', async (req, res) => {
  try {
    const { channelIds, category } = req.body || {};
    if (!Array.isArray(channelIds) || !category) {
      return res.status(400).json({ error: 'channelIds[] and category required' });
    }
    const result = await store.assignChannelsToCategory(channelIds, category);
    res.json({ ok: true, ...result, category });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'bulk-assign failed' });
  }
});

export default router;
