const express = require('express');
const router = express.Router();
const { buildAutoOrganize, readCached } = require('../autoOrganize/builder');

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

module.exports = router;
