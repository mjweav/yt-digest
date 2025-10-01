import express from 'express';
import { JsonStore } from '../utils/jsonStore.js';
import { GoogleAuth } from '../utils/googleAuth.js';

const router = express.Router();

/**
 * Get authentication status
 * GET /api/auth/status
 */
router.get('/status', async (req, res) => {
  try {
    const usersData = JsonStore.getData('users');
    const user = usersData.users[usersData.users.length - 1]; // Use most recent user

    if (!user || !user.accessToken) {
      return res.json({
        connected: false,
        message: 'Not connected to YouTube'
      });
    }

    // Try to get user info from YouTube to verify token is still valid
    try {
      const youtube = await GoogleAuth.getYouTubeClient(user.id);
      const response = await youtube.channels.list({
        part: 'snippet',
        mine: true,
        maxResults: 1
      });

      const channel = response.data.items?.[0];
      if (channel) {
        return res.json({
          connected: true,
          googleId: user.googleId,
          channelTitle: channel.snippet.title,
          channelId: channel.id,
          userId: user.id,
          expiresAt: user.expiresAt
        });
      }
    } catch (youtubeError) {
      console.error('Error verifying YouTube connection:', youtubeError);

      // If token is invalid, clear it
      if (youtubeError.message.includes('Not Authorized') ||
          youtubeError.message.includes('invalid_grant')) {
        console.log('Token invalid, clearing user data...');
        usersData.users = usersData.users.filter(u => u.id !== user.id);
        JsonStore.setData('users', usersData);

        return res.json({
          connected: false,
          message: 'Token expired, please reconnect'
        });
      }
    }

    // If we get here, user exists but we couldn't verify with YouTube
    res.json({
      connected: true,
      googleId: user.googleId,
      userId: user.id,
      expiresAt: user.expiresAt,
      verified: false
    });

  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({
      error: 'Failed to check authentication status',
      message: error.message
    });
  }
});

/**
 * Disconnect from YouTube (clear tokens)
 * POST /api/auth/disconnect
 */
router.post('/disconnect', async (req, res) => {
  try {
    const usersData = JsonStore.getData('users');
    const user = usersData.users[usersData.users.length - 1]; // Use most recent user

    if (user) {
      console.log(`Disconnecting user: ${user.id}`);

      // Remove the user from the users array
      usersData.users = usersData.users.filter(u => u.id !== user.id);
      JsonStore.setData('users', usersData);

      console.log('User disconnected successfully');
    }

    res.json({
      success: true,
      message: 'Successfully disconnected from YouTube'
    });

  } catch (error) {
    console.error('Error disconnecting:', error);
    res.status(500).json({
      error: 'Failed to disconnect',
      message: error.message
    });
  }
});

/**
 * Get Google OAuth URL for frontend
 * GET /api/auth/google/url
 */
router.get('/google/url', (req, res) => {
  try {
    const authUrl = GoogleAuth.getAuthUrl();
    res.json({
      success: true,
      authUrl: authUrl,
      message: 'Visit this URL to authorize the application'
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * Handle Google OAuth callback
 * GET /api/auth/google/callback
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, error: oauthError, state } = req.query;

    if (oauthError) {
      console.error('OAuth error:', oauthError);
      return res.redirect(`http://localhost:3000/settings?error=${encodeURIComponent(oauthError)}`);
    }

    if (!code) {
      console.error('Authorization code missing');
      return res.redirect('http://localhost:3000/settings?error=missing_code');
    }

    console.log('OAuth callback: Processing authorization code...');
    const result = await GoogleAuth.getTokens(code);

    console.log('OAuth callback: Authentication successful, redirecting to app...');

    // Redirect back to the Settings page with success indicator
    res.redirect('http://localhost:3000/settings?oauth=success');

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`http://localhost:3000/?error=${encodeURIComponent(error.message)}`);
  }
});

export default router;
