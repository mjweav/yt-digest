import express from 'express';
const router = express.Router();

// TODO: integrate with real categories store.
// For spike: return a stable list (update anytime).
const stubCategories = [
  "AI & Emerging Tech",
  "Video Editing & Creative Tools",
  "Business, Startups & Marketing",
  "Photography & Cameras",
  "DIY & Home Projects",
  "News & Commentary",
  "Aviation & Transport",
  "Music & Musicians"
];

router.get('/', (_req, res) => {
  res.json({ categories: stubCategories });
});

router.post('/', (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name required' });
  }
  // Spike: pretend creation succeeded (no persistence).
  res.json({ ok: true, name: name.trim() });
});

router.post('/bulk-assign', (req, res) => {
  const { channelIds, category } = req.body || {};
  if (!Array.isArray(channelIds) || !category || typeof category !== 'string') {
    return res.status(400).json({ error: 'channelIds array and category required' });
  }
  // Spike: pretend bulk assignment succeeded (no persistence).
  res.json({ ok: true, count: channelIds.length, category });
});

export default router;
