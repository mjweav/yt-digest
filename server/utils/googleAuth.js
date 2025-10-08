import { google } from 'googleapis';
import { JsonStore } from './jsonStore.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read OAuth 2.0 configuration from client_secret.json
const credentialsPath = join(__dirname, '../../client_secret.json');
const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));

const CLIENT_ID = credentials.installed.client_id;
const CLIENT_SECRET = credentials.installed.client_secret;
const REDIRECT_URI = credentials.installed.redirect_uris[0]; // Use the first redirect URI from config

// YouTube API scope for read-only access
const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];

/**
 * Google OAuth utility for YouTube API integration
 */
export class GoogleAuth {
  /**
   * Initialize OAuth2 client
   * @returns {google.auth.OAuth2} OAuth2 client instance
   */
  static getOAuth2Client() {
    return new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );
  }

  /**
   * Generate Google OAuth consent screen URL
   * @param {string} state - Optional state parameter for security
   * @returns {string} Authorization URL
   */
  static getAuthUrl(state = 'subscription-curator') {
    const oauth2Client = this.getOAuth2Client();

    return oauth2Client.generateAuthUrl({
      access_type: 'offline', // Gets refresh token
      scope: SCOPES,
      state: state,
      prompt: 'consent' // Forces consent screen every time for testing
    });
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * @param {string} code - Authorization code from Google
   * @returns {Promise<Object>} Token information
   */
  static async getTokens(code) {
    try {
      const oauth2Client = this.getOAuth2Client();

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Save tokens to users.json
      const usersData = JsonStore.getData('users');

      const user = {
        id: `user_${Date.now()}`,
        googleId: 'placeholder-google-id', // In real app, get from token info
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + (tokens.expiry_date || 3600 * 1000)).toISOString(),
        createdAt: new Date().toISOString()
      };

      usersData.users.push(user);
      JsonStore.setData('users', usersData);

      return {
        success: true,
        user: user,
        tokens: tokens
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error(`Failed to get tokens: ${error.message}`);
    }
  }

  /**
   * Get a valid access token (refreshes if necessary)
   * @param {string} userId - User ID from users.json
   * @returns {Promise<string>} Valid access token
   */
  static async getValidAccessToken(userId) {
    try {
      const usersData = JsonStore.getData('users');
      const user = usersData.users.find(u => u.id === userId);

      if (!user) {
        throw new Error('User not found');
      }

      return await this.refreshAccessTokenIfNeeded(user, usersData);
    } catch (error) {
      console.error('Error getting valid access token:', error);
      throw new Error(`Failed to get valid access token: ${error.message}`);
    }
  }

  /**
   * Refresh access token if needed and return the valid token
   * @param {Object} user - User object from users.json
   * @param {Object} usersData - Users data store
   * @returns {Promise<string>} Valid access token
   */
  static async refreshAccessTokenIfNeeded(user, usersData) {
    try {
      // Check if token is expired or expires soon (within 5 minutes)
      const now = Date.now();
      const expiresAt = new Date(user.expiresAt).getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (now >= (expiresAt - fiveMinutes)) {
        console.log('Access token expired or expires soon, refreshing...');

        if (!user.refreshToken) {
          throw new Error('No refresh token available - user needs to re-authenticate');
        }

        // Refresh the token
        const oauth2Client = this.getOAuth2Client();
        oauth2Client.setCredentials({
          access_token: user.accessToken,
          refresh_token: user.refreshToken
        });

        try {
          const { credentials } = await oauth2Client.refreshAccessToken();

          // Update stored tokens
          user.accessToken = credentials.access_token;
          if (credentials.refresh_token) {
            user.refreshToken = credentials.refresh_token;
          }
          user.expiresAt = new Date(Date.now() + (credentials.expiry_date || 3600 * 1000)).toISOString();

          JsonStore.setData('users', usersData);

          console.log('Token refreshed successfully');
          return credentials.access_token;
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);

          // Handle specific refresh token errors
          if (refreshError.code === 400 && refreshError.errors?.[0]?.reason === 'invalid_grant') {
            console.log('Refresh token invalid or expired - user needs to re-authenticate');
            throw new Error('Refresh token invalid - user needs to re-authenticate');
          }

          throw refreshError;
        }
      }

      return user.accessToken;
    } catch (error) {
      console.error('Error in refreshAccessTokenIfNeeded:', error);
      throw error;
    }
  }

  /**
   * Get authorized OAuth2 client (refreshes tokens if needed)
   * @param {string} userId - User ID from users.json
   * @returns {Promise<google.auth.OAuth2>} Authorized OAuth2 client
   */
  static async getAuthorizedClient(userId) {
    try {
      const usersData = JsonStore.getData('users');
      const user = usersData.users.find(u => u.id === userId);

      if (!user) {
        throw new Error('Not Authorized: User not found');
      }

      if (!user.accessToken) {
        throw new Error('Not Authorized: No access token found');
      }

      // Refresh token if needed and get the valid access token
      const validAccessToken = await this.refreshAccessTokenIfNeeded(user, usersData);

      const oauth2Client = this.getOAuth2Client();

      // Set the current credentials with the valid token
      oauth2Client.setCredentials({
        access_token: validAccessToken,
        refresh_token: user.refreshToken
      });

      return oauth2Client;
    } catch (error) {
      console.error('Error getting authorized client:', error);

      // Handle specific error cases for better user experience
      if (error.message.includes('No refresh token available') ||
          error.message.includes('Refresh token invalid')) {
        throw new Error('Authentication expired - user needs to re-authenticate');
      }

      throw error;
    }
  }

  /**
   * Create authenticated YouTube API client
   * @param {string} userId - User ID from users.json
   * @returns {Promise<google.youtube>} YouTube API client
   */
  static async getYouTubeClient(userId) {
    try {
      const oauth2Client = await this.getAuthorizedClient(userId);

      return google.youtube({
        version: 'v3',
        auth: oauth2Client
      });
    } catch (error) {
      console.error('Error creating YouTube client:', error);
      throw error;
    }
  }
}
