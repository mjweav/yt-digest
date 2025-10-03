import express from 'express';
import cors from 'cors';
import { JsonStore } from './utils/jsonStore.js';
import { GoogleAuth } from './utils/googleAuth.js';
// Import routes
import authRoutes from './routes/auth.js';
import youtubeRoutes from './routes/youtube.js';
import autoOrganizeRoutes from './routes/autoOrganize.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize data files on startup
JsonStore.initializeDataFiles();

// API Routes

// Channels API
app.get('/api/channels', (req, res) => {
  try {
    const data = JsonStore.getData('channels');
    res.json(data.channels || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/channels', (req, res) => {
  try {
    const channels = req.body;
    if (!Array.isArray(channels)) {
      return res.status(400).json({ error: 'Channels must be an array' });
    }

    const data = { channels };
    JsonStore.setData('channels', data);
    res.json({ success: true, count: channels.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tags API
app.get('/api/tags', (req, res) => {
  try {
    const data = JsonStore.getData('tags');
    res.json(data.tags || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tags', (req, res) => {
  try {
    const tags = req.body;
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    const data = { tags };
    JsonStore.setData('tags', data);
    res.json({ success: true, count: tags.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Selections API (Channel selections for digest)
app.get('/api/selections', (req, res) => {
  try {
    const data = JsonStore.getData('selections');
    // Return selections in the new format with tagId support
    res.json({
      selections: data.selections || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/selections', (req, res) => {
  try {
    const { selections } = req.body;

    if (!Array.isArray(selections)) {
      return res.status(400).json({ error: 'Selections must be an array' });
    }

    // Validate that each selection has the required structure
    for (const selection of selections) {
      if (!selection.channelId || typeof selection.selected !== 'boolean') {
        return res.status(400).json({
          error: 'Each selection must have channelId and selected properties'
        });
      }
      // tagId is optional - channels can exist without tags
    }

    const data = { selections };
    JsonStore.setData('selections', data);

    res.json({
      success: true,
      selectionsCount: selections.length,
      selectedCount: selections.filter(s => s.selected).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Watched API
app.get('/api/watched', (req, res) => {
  try {
    const data = JsonStore.getData('watched');
    res.json(data.watched || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/watched', (req, res) => {
  try {
    const watchedItem = req.body;
    if (!watchedItem.videoId || !watchedItem.userId) {
      return res.status(400).json({ error: 'videoId and userId are required' });
    }

    // Add timestamp if not provided
    if (!watchedItem.watchedAt) {
      watchedItem.watchedAt = new Date().toISOString();
    }

    JsonStore.appendData('watched', watchedItem);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Digests API (Cached digest data)
app.get('/api/digests/latest', (req, res) => {
  try {
    const data = JsonStore.getData('digests');

    if (!data.digests || data.digests.length === 0) {
      return res.status(404).json({
        error: 'No cached digests found',
        digest: [],
        count: 0
      });
    }

    // Return the most recent digest
    const latestDigest = data.digests[data.digests.length - 1];

    // Handle both old and new digest structures
    const count = latestDigest.digest.reduce((total, group) => {
      if (group.channels) {
        // New structure: group.channels[].videos[]
        return total + group.channels.reduce((chTotal, ch) => chTotal + ch.videos.length, 0);
      } else if (group.videos) {
        // Old structure: group.videos[]
        return total + group.videos.length;
      }
      return total;
    }, 0);

    res.json({
      success: true,
      digest: latestDigest.digest,
      count: count,
      cachedAt: latestDigest.fetchedAt,
      date: latestDigest.date,
      isCached: true
    });
  } catch (error) {
    console.error('Error loading cached digest:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/auto-organize', autoOrganizeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Subscription Curator API'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Subscription Curator API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 API endpoints available at http://localhost:${PORT}/api/`);
});
