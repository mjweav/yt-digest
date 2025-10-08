# Authentication Documentation

## Overview

This application uses Google OAuth 2.0 for YouTube API integration, allowing users to authenticate and access their YouTube data securely.

## OAuth Configuration

- **Client Configuration**: OAuth credentials are stored in `client_secret.json`
- **Scopes**: `https://www.googleapis.com/auth/youtube.readonly`
- **Redirect URI**: Configured in Google Cloud Console (matches `client_secret.json`)
- **Ports**: Backend runs on port 3001, frontend on port 3000

## Token Management

### Access Tokens
- **Duration**: 1 hour (3600 seconds) by default
- **Auto-refresh**: Tokens are automatically refreshed when expired (within 5 minutes of expiry)
- **Storage**: Tokens are stored in `data/users.json`

### Refresh Tokens
- **Duration**: Long-lived (until user revokes access)
- **Usage**: Used to obtain new access tokens when current ones expire
- **Security**: Stored securely in `data/users.json`

## API Endpoints

### Authentication Status
```http
GET /api/auth/status
```

**Response Fields:**
- `connected` (boolean): Whether user is authenticated
- `googleId` (string): Google user ID
- `channelTitle` (string): YouTube channel name
- `channelId` (string): YouTube channel ID
- `userId` (string): Internal user ID
- `expiresAt` (string): Token expiry timestamp
- `hasRefreshToken` (boolean): Whether refresh token is available
- `scopes` (array): Granted OAuth scopes
- `tokenExpiryISO` (string): ISO format token expiry
- `verified` (boolean): Whether token was successfully verified with YouTube API

### OAuth URL Generation
```http
GET /api/auth/google/url
```

Returns the Google OAuth consent screen URL for user authentication.

### OAuth Callback
```http
GET /api/auth/google/callback
```

Processes the OAuth callback with authorization code and exchanges it for tokens.

## Token Refresh and Recovery

### Automatic Token Refresh
The system automatically handles token refresh in the following scenarios:

1. **Proactive Refresh**: Tokens are refreshed when they expire within 5 minutes
2. **API Call Refresh**: YouTube API calls automatically refresh expired tokens
3. **Background Refresh**: Tokens are refreshed before making authenticated requests

### Expired Token Handling
When tokens expire, the system:

1. **Detects Expiry**: Checks token expiry before API calls
2. **Attempts Refresh**: Uses refresh token to get new access token
3. **Updates Storage**: Persists new tokens to `data/users.json`
4. **Graceful Degradation**: If refresh fails, provides clear error messages

### Invalid Refresh Token Scenarios

#### Case 1: Refresh Token Available
```json
{
  "connected": true,
  "verified": false,
  "expired": true,
  "hasRefreshToken": true
}
```
- Token is expired but refresh token exists
- Next API call will attempt automatic refresh

#### Case 2: No Refresh Token
```json
{
  "connected": false,
  "needsReauth": true,
  "hasRefreshToken": false,
  "message": "Authentication expired - user needs to re-authenticate"
}
```
- No refresh token available
- User must re-authenticate through OAuth flow

#### Case 3: Invalid Refresh Token
```json
{
  "connected": false,
  "needsReauth": true,
  "hasRefreshToken": true,
  "message": "Refresh token invalid - user needs to re-authenticate"
}
```
- Refresh token exists but is invalid/expired
- User must re-authenticate through OAuth flow

### Error Recovery
When authentication expires:

1. **Clear Error State**: The system doesn't crash or lose user data
2. **Preserve User Record**: User record remains in `data/users.json`
3. **Clear Status Reporting**: API clearly indicates re-authentication is needed
4. **Easy Re-auth**: Users can simply visit the OAuth URL again

## Security Considerations

- **Token Storage**: Access and refresh tokens are stored locally in `data/users.json`
- **No Long-term Persistence**: Consider implementing database storage for production
- **Scope Limitation**: Only requests `youtube.readonly` scope for security
- **State Parameter**: Uses state parameter to prevent CSRF attacks

## Troubleshooting

### Common Issues

1. **"Token expired" errors**
   - Normal behavior - tokens auto-refresh
   - If persistent, check refresh token validity

2. **"invalid_grant" errors**
   - Refresh token has been revoked
   - User needs to re-authenticate

3. **"No refresh token" errors**
   - Initial OAuth flow didn't include `access_type: offline`
   - Re-authenticate with proper scope

### Manual Token Refresh Testing
```bash
# Check current auth status
curl http://localhost:3001/api/auth/status

# Test YouTube API call (triggers refresh if needed)
curl http://localhost:3001/api/youtube/test
```

## Development Notes

- **No Environment Variables**: Configuration reads directly from `client_secret.json`
- **No Port Changes**: Maintains existing port configuration (3000/3001)
- **No Redirect URI Changes**: Uses existing Google Cloud Console configuration
- **Backward Compatible**: Existing authentication flows continue to work
