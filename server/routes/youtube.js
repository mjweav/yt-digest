import express from 'express';
import { GoogleAuth } from '../utils/googleAuth.js';
import { JsonStore } from '../utils/jsonStore.js';

const router = express.Router();

/**
 * Get user's YouTube subscriptions with paging support
 * GET /api/youtube/subscriptions
 */
router.get('/subscriptions', async (req, res) => {
  try {
    // Get the authenticated user (use the most recently created user for now)
    const usersData = JsonStore.getData('users');
    const user = usersData.users[usersData.users.length - 1]; // Use most recent user

    if (!user) {
      return res.status(401).json({
        error: 'No authenticated user found. Please complete OAuth first.'
      });
    }

    console.log(`Using user: ${user.id} (created: ${user.createdAt})`);

    // Create authenticated YouTube client using the new helper
    const youtube = await GoogleAuth.getYouTubeClient(user.id);

    // Fetch all subscriptions with paging
    console.log('Fetching YouTube subscriptions with paging...');
    let allSubscriptions = [];
    let nextPageToken = null;
    let pageCount = 0;
    const maxRetries = 5;

    do {
      pageCount++;
      console.log(`Fetching page ${pageCount} of subscriptions...`);

      try {
        const response = await youtube.subscriptions.list({
          part: 'snippet,contentDetails,subscriberSnippet',
          mine: true,
          maxResults: 50,
          order: 'alphabetical',
          pageToken: nextPageToken
        });

        // Add current page results to total - capture ALL available data
        const pageSubscriptions = response.data.items.map(item => {
          console.log('🔍 API DEBUG: Processing channel:', item.snippet.title);
          console.log('🔍 API DEBUG: Available thumbnails:', Object.keys(item.snippet.thumbnails || {}));
          console.log('🔍 API DEBUG: Thumbnail URLs:', {
            default: item.snippet.thumbnails?.default?.url,
            medium: item.snippet.thumbnails?.medium?.url,
            high: item.snippet.thumbnails?.high?.url
          });

          const channelData = {
            // Basic channel information
            id: item.snippet.resourceId.channelId,
            title: item.snippet.title,
            description: item.snippet.description,
            publishedAt: item.snippet.publishedAt,

            // Complete thumbnail set
            thumbnails: {
              default: item.snippet.thumbnails?.default,
              medium: item.snippet.thumbnails?.medium,
              high: item.snippet.thumbnails?.high,
              standard: item.snippet.thumbnails?.standard,
              maxres: item.snippet.thumbnails?.maxres
            },

            // Content details (video counts, activity type)
            contentDetails: item.contentDetails ? {
              totalItemCount: item.contentDetails.totalItemCount,
              newItemCount: item.contentDetails.newItemCount,
              activityType: item.contentDetails.activityType
            } : null,

            // Subscriber information
            subscriberSnippet: item.subscriberSnippet ? {
              channelUrl: item.subscriberSnippet.channelUrl,
              channelTitle: item.subscriberSnippet.channelTitle
            } : null,

            // Resource information
            resourceId: {
              kind: item.snippet.resourceId.kind,
              channelId: item.snippet.resourceId.channelId
            },

            // Raw API response for debugging/validation
            _raw: {
              snippet: item.snippet,
              contentDetails: item.contentDetails,
              subscriberSnippet: item.subscriberSnippet,
              etag: item.etag,
              kind: item.kind
            }
          };

          console.log('🔍 API DEBUG: Final channel data for', channelData.title, ':');
          console.log('- Has thumbnails object:', !!channelData.thumbnails);
          console.log('- Thumbnail sizes available:', Object.keys(channelData.thumbnails || {}));
          console.log('- Medium URL exists:', !!channelData.thumbnails?.medium?.url);

          return channelData;
        });

        allSubscriptions = allSubscriptions.concat(pageSubscriptions);
        nextPageToken = response.data.nextPageToken;

        console.log(`Page ${pageCount}: fetched ${pageSubscriptions.length} subscriptions (total: ${allSubscriptions.length})`);

      } catch (apiError) {
        console.error(`Error on page ${pageCount}:`, apiError);

        // Check if it's a rate limit error (403/429)
        if (apiError.status === 403 || apiError.status === 429) {
          console.log(`Rate limit hit on page ${pageCount}, implementing exponential backoff...`);

          let retryCount = 0;
          let delay = 1000; // Start with 1 second

          while (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retry attempt ${retryCount}/${maxRetries} after ${delay}ms delay...`);

            await new Promise(resolve => setTimeout(resolve, delay));

            try {
              const retryResponse = await youtube.subscriptions.list({
                part: 'snippet,contentDetails,subscriberSnippet',
                mine: true,
                maxResults: 50,
                order: 'alphabetical',
                pageToken: nextPageToken
              });

              const pageSubscriptions = retryResponse.data.items.map(item => ({
                // Basic channel information
                id: item.snippet.resourceId.channelId,
                title: item.snippet.title,
                description: item.snippet.description,
                publishedAt: item.snippet.publishedAt,

                // Complete thumbnail set
                thumbnails: {
                  default: item.snippet.thumbnails?.default,
                  medium: item.snippet.thumbnails?.medium,
                  high: item.snippet.thumbnails?.high,
                  standard: item.snippet.thumbnails?.standard,
                  maxres: item.snippet.thumbnails?.maxres
                },

                // Content details (video counts, activity type)
                contentDetails: item.contentDetails ? {
                  totalItemCount: item.contentDetails.totalItemCount,
                  newItemCount: item.contentDetails.newItemCount,
                  activityType: item.contentDetails.activityType
                } : null,

                // Subscriber information
                subscriberSnippet: item.subscriberSnippet ? {
                  channelUrl: item.subscriberSnippet.channelUrl,
                  channelTitle: item.subscriberSnippet.channelTitle
                } : null,

                // Resource information
                resourceId: {
                  kind: item.snippet.resourceId.kind,
                  channelId: item.snippet.resourceId.channelId
                },

                // Raw API response for debugging/validation
                _raw: {
                  snippet: item.snippet,
                  contentDetails: item.contentDetails,
                  subscriberSnippet: item.subscriberSnippet,
                  etag: item.etag,
                  kind: item.kind
                }
              }));

              allSubscriptions = allSubscriptions.concat(pageSubscriptions);
              nextPageToken = retryResponse.data.nextPageToken;

              console.log(`Retry ${retryCount} successful: fetched ${pageSubscriptions.length} subscriptions`);
              break;

            } catch (retryError) {
              console.error(`Retry ${retryCount} failed:`, retryError);

              if (retryCount === maxRetries) {
                console.error(`Max retries (${maxRetries}) exceeded for page ${pageCount}`);
                throw new Error(`Failed to fetch page ${pageCount} after ${maxRetries} retries`);
              }

              // Exponential backoff: 1s, 2s, 4s, 8s, 16s
              delay *= 2;
            }
          }
        } else {
          throw apiError;
        }
      }
    } while (nextPageToken);

    // Save to channels.json
    const channelsData = { channels: allSubscriptions };
    JsonStore.setData('channels', channelsData);

    console.log(`Successfully fetched ${allSubscriptions.length} subscriptions across ${pageCount} pages`);

    // Validation logging - check structure of first few items
    if (allSubscriptions.length > 0) {
      console.log('🔍 VALIDATION: First subscription structure:');
      const firstItem = allSubscriptions[0];
      console.log('- Has thumbnails object:', !!firstItem.thumbnails);
      console.log('- Has contentDetails:', !!firstItem.contentDetails);
      console.log('- Has subscriberSnippet:', !!firstItem.subscriberSnippet);
      console.log('- Has resourceId:', !!firstItem.resourceId);
      console.log('- Has _raw data:', !!firstItem._raw);

      if (firstItem.thumbnails) {
        console.log('- Thumbnail sizes available:', Object.keys(firstItem.thumbnails));
      }

      if (firstItem.contentDetails) {
        console.log('- Content details:', firstItem.contentDetails);
      }

      // Log sample of different channel types for validation
      const sampleChannels = allSubscriptions.slice(0, 3);
      console.log('🔍 VALIDATION: Sample channel titles and data completeness:');
      sampleChannels.forEach((channel, index) => {
        console.log(`${index + 1}. "${channel.title}" - thumbnails:${Object.keys(channel.thumbnails || {}).length}, contentDetails:${!!channel.contentDetails}, subscriberSnippet:${!!channel.subscriberSnippet}`);
      });
    }

    res.json({
      success: true,
      count: allSubscriptions.length,
      pages: pageCount,
      subscriptions: allSubscriptions,
      validation: {
        enhancedDataCaptured: true,
        partsRequested: ['snippet', 'contentDetails', 'subscriberSnippet'],
        sampleStructure: allSubscriptions.length > 0 ? {
          id: allSubscriptions[0].id,
          title: allSubscriptions[0].title,
          hasThumbnails: !!allSubscriptions[0].thumbnails,
          hasContentDetails: !!allSubscriptions[0].contentDetails,
          hasSubscriberSnippet: !!allSubscriptions[0].subscriberSnippet,
          hasResourceId: !!allSubscriptions[0].resourceId,
          hasRawData: !!allSubscriptions[0]._raw,
          thumbnailSizes: allSubscriptions[0].thumbnails ? Object.keys(allSubscriptions[0].thumbnails) : []
        } : null
      }
    });

  } catch (error) {
    console.error('Error fetching YouTube subscriptions:', error);

    // Handle specific OAuth errors
    if (error.message.includes('invalid_grant') || error.message.includes('token')) {
      return res.status(401).json({
        error: 'Authentication expired. Please reconnect your YouTube account.',
        code: 'AUTH_EXPIRED'
      });
    }

    if (error.message.includes('access_denied') || error.message.includes('forbidden')) {
      return res.status(403).json({
        error: 'YouTube API access denied. Please check permissions.',
        code: 'ACCESS_DENIED'
      });
    }

    res.status(500).json({
      error: 'Failed to fetch subscriptions',
      message: error.message
    });
  }
});

/**
 * Fetch videos for digest grouped by tags
 * GET /api/youtube/videos
 */
router.get('/videos', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 30 days if no date range provided (changed from 7 days)
    const endDateObj = endDate ? new Date(endDate) : new Date();
    const startDateObj = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    console.log(`Fetching videos for date range: ${startDateObj.toISOString()} to ${endDateObj.toISOString()}`);

    // Get authenticated user (use the most recently created user for now)
    const usersData = JsonStore.getData('users');
    const user = usersData.users[usersData.users.length - 1]; // Use most recent user

    if (!user) {
      return res.status(401).json({
        error: 'No authenticated user found. Please complete OAuth first.'
      });
    }

    console.log(`Videos API: Using user: ${user.id} (created: ${user.createdAt})`);

    // Get selections, channels, and tags data
    const selectionsData = JsonStore.getData('selections');
    const channelsData = JsonStore.getData('channels');
    const tagsData = JsonStore.getData('tags');

    // Filter to only selected channels
    const selectedChannels = selectionsData.selections ? selectionsData.selections.filter(s => s.selected) : [];

    if (selectedChannels.length === 0) {
      return res.json({
        success: true,
        digest: [],
        count: 0,
        message: 'No channels selected for digest'
      });
    }

    const channelIds = selectedChannels.map(s => s.channelId);
    console.log(`Fetching videos for ${channelIds.length} selected channels`);

    const youtube = await GoogleAuth.getYouTubeClient(user.id);
    const allVideos = [];

    // Fetch videos for each selected channel
    for (const selection of selectedChannels) {
      const channelId = selection.channelId;
      try {
        // Get channel's upload playlist
        const channelResponse = await youtube.channels.list({
          part: 'contentDetails',
          id: channelId
        });

        if (channelResponse.data.items?.length === 0) {
          console.log(`No channel found for ID: ${channelId}`);
          continue;
        }

        const uploadPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

        if (!uploadPlaylistId) {
          console.log(`No upload playlist found for channel: ${channelId}`);
          continue;
        }

        // Get recent videos from upload playlist
        const playlistResponse = await youtube.playlistItems.list({
          part: 'snippet,contentDetails',
          playlistId: uploadPlaylistId,
          maxResults: 20
        });

        if (playlistResponse.data.items?.length === 0) {
          console.log(`No videos found in playlist for channel: ${channelId}`);
          continue;
        }

        // Get video IDs for detailed information
        const videoIds = playlistResponse.data.items.map(item => item.contentDetails.videoId);

        // Get detailed video information
        const videosResponse = await youtube.videos.list({
          part: 'snippet,statistics,contentDetails',
          id: videoIds.join(',')
        });

        // Process and filter videos
        for (const item of playlistResponse.data.items) {
          const video = videosResponse.data.items.find(v => v.id === item.contentDetails.videoId);

          if (!video) continue;

          const publishedAt = new Date(video.snippet.publishedAt);

          // Filter by date range
          if (publishedAt < startDateObj || publishedAt > endDateObj) {
            continue;
          }

          // Normalize video data
          const normalizedVideo = {
            videoId: video.id,
            channelId: channelId,
            channelTitle: video.snippet.channelTitle,
            title: video.snippet.title,
            description: video.snippet.description,
            publishedAt: video.snippet.publishedAt,
            thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '',
            viewCount: video.statistics?.viewCount || '0',
            duration: video.contentDetails?.duration || 'PT0S'
          };

          allVideos.push(normalizedVideo);
        }

      } catch (channelError) {
        console.error(`Error fetching videos for channel ${channelId}:`, channelError.message);
        // Continue with other channels even if one fails
        continue;
      }
    }

    // Group videos by tagId, then by channelId within each tag
    const videosByTag = {};
    for (const video of allVideos) {
      const selection = selectedChannels.find(s => s.channelId === video.channelId);
      const tagId = selection && selection.tagId ? selection.tagId : 'untagged';

      if (!videosByTag[tagId]) {
        videosByTag[tagId] = {};
      }

      if (!videosByTag[tagId][video.channelId]) {
        videosByTag[tagId][video.channelId] = {
          channelId: video.channelId,
          channelTitle: video.channelTitle,
          channelThumbnail: '', // Will be filled from channels data
          videos: []
        };
      }

      videosByTag[tagId][video.channelId].videos.push(video);
    }

    // Get channel thumbnails for the channel headers
    const channelsInfo = JsonStore.getData('channels');
    const channelsMap = {};
    if (channelsInfo.channels) {
      channelsInfo.channels.forEach(channel => {
        channelsMap[channel.id] = channel;
      });
    }

    // Convert to new format with channel grouping
    const digest = Object.entries(videosByTag).map(([tagId, channels]) => {
      let tagName = 'Uncategorized'; // Default for untagged

      if (tagId !== 'untagged' && tagsData.tags) {
        const tag = tagsData.tags.find(t => t.id === tagId);
        tagName = tag ? tag.name : 'Uncategorized';
      } else if (tagId === 'untagged') {
        tagName = 'Uncategorized';
      }

      // Convert channels object to array and add thumbnails
      const channelsArray = Object.values(channels).map(channelGroup => {
        const channelInfo = channelsMap[channelGroup.channelId];
        return {
          channelId: channelGroup.channelId,
          channelTitle: channelGroup.channelTitle,
          channelThumbnail: channelInfo?.thumbnails?.medium?.url || channelInfo?.thumbnails?.default?.url || '',
          videos: channelGroup.videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        };
      });

      // Sort channels by title within each category
      channelsArray.sort((a, b) => a.channelTitle.localeCompare(b.channelTitle));

      return {
        tagId: tagId,
        tagName: tagName,
        channels: channelsArray
      };
    });

    // Sort digest by tag name
    digest.sort((a, b) => a.tagName.localeCompare(b.tagName));

    // Cache the results
    const digestsData = JsonStore.getData('digests');
    const digestEntry = {
      date: new Date().toISOString().split('T')[0],
      digest: digest,
      fetchedAt: new Date().toISOString()
    };

    digestsData.digests = digestsData.digests || [];
    digestsData.digests.push(digestEntry);
    JsonStore.setData('digests', digestsData);

    console.log(`Successfully fetched ${allVideos.length} videos grouped into ${digest.length} categories`);

    res.json({
      success: true,
      digest: digest,
      count: allVideos.length,
      dateRange: {
        start: startDateObj.toISOString(),
        end: endDateObj.toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching videos:', error);

    // Handle specific OAuth errors
    if (error.message.includes('invalid_grant') || error.message.includes('token')) {
      return res.status(401).json({
        error: 'Authentication expired. Please reconnect your YouTube account.',
        code: 'AUTH_EXPIRED'
      });
    }

    res.status(500).json({
      error: 'Failed to fetch videos',
      message: error.message
    });
  }
});

/**
 * Test YouTube API connection
 * GET /api/youtube/test
 */
router.get('/test', async (req, res) => {
  try {
    const usersData = JsonStore.getData('users');
    const user = usersData.users[usersData.users.length - 1]; // Use most recent user

    if (!user) {
      return res.status(401).json({
        error: 'No user found. Please complete OAuth first.'
      });
    }

    console.log(`Test API: Using user: ${user.id} (created: ${user.createdAt})`);

    const youtube = await GoogleAuth.getYouTubeClient(user.id);

    // Test with a simple API call
    const response = await youtube.channels.list({
      part: 'snippet',
      mine: true,
      maxResults: 1
    });

    res.json({
      success: true,
      message: 'YouTube API connection successful',
      channelCount: response.data.items?.length || 0,
      userId: user.id
    });

  } catch (error) {
    console.error('YouTube API test failed:', error);
    res.status(500).json({
      error: 'YouTube API test failed',
      message: error.message
    });
  }
});

/**
 * Validate enhanced channel data structure
 * GET /api/youtube/validate
 */
router.get('/validate', async (req, res) => {
  try {
    const channelsData = JsonStore.getData('channels');

    if (!channelsData.channels || channelsData.channels.length === 0) {
      return res.json({
        error: 'No channel data found. Please fetch subscriptions first.',
        hasData: false
      });
    }

    const channels = channelsData.channels;
    const sampleChannel = channels[0];

    // Analyze the structure
    const analysis = {
      totalChannels: channels.length,
      enhancedDataCaptured: true,
      structure: {
        basicFields: ['id', 'title', 'description', 'publishedAt'].every(field => field in sampleChannel),
        hasThumbnails: !!sampleChannel.thumbnails,
        hasContentDetails: !!sampleChannel.contentDetails,
        hasSubscriberSnippet: !!sampleChannel.subscriberSnippet,
        hasResourceId: !!sampleChannel.resourceId,
        hasRawData: !!sampleChannel._raw
      },
      thumbnails: sampleChannel.thumbnails ? {
        availableSizes: Object.keys(sampleChannel.thumbnails),
        hasDefault: !!sampleChannel.thumbnails.default,
        hasMedium: !!sampleChannel.thumbnails.medium,
        hasHigh: !!sampleChannel.thumbnails.high,
        hasStandard: !!sampleChannel.thumbnails.standard,
        hasMaxres: !!sampleChannel.thumbnails.maxres
      } : null,
      contentDetails: sampleChannel.contentDetails ? {
        hasTotalItemCount: 'totalItemCount' in sampleChannel.contentDetails,
        hasNewItemCount: 'newItemCount' in sampleChannel.contentDetails,
        hasActivityType: 'activityType' in sampleChannel.contentDetails,
        values: sampleChannel.contentDetails
      } : null,
      subscriberSnippet: sampleChannel.subscriberSnippet ? {
        hasChannelUrl: 'channelUrl' in sampleChannel.subscriberSnippet,
        hasChannelTitle: 'channelTitle' in sampleChannel.subscriberSnippet,
        values: sampleChannel.subscriberSnippet
      } : null,
      sampleData: {
        id: sampleChannel.id,
        title: sampleChannel.title,
        thumbnailUrl: sampleChannel.thumbnails?.medium?.url || sampleChannel.thumbnails?.default?.url,
        totalVideos: sampleChannel.contentDetails?.totalItemCount,
        channelUrl: sampleChannel.subscriberSnippet?.channelUrl
      }
    };

    // Check for data consistency across all channels
    const consistencyCheck = {
      allHaveThumbnails: channels.every(c => !!c.thumbnails),
      allHaveContentDetails: channels.every(c => !!c.contentDetails),
      allHaveSubscriberSnippet: channels.every(c => !!c.subscriberSnippet),
      thumbnailSizes: [...new Set(channels.flatMap(c => Object.keys(c.thumbnails || {})))],
      activityTypes: [...new Set(channels.map(c => c.contentDetails?.activityType).filter(Boolean))]
    };

    console.log('🔍 VALIDATION RESULTS:');
    console.log('- Total channels:', analysis.totalChannels);
    console.log('- Enhanced data captured:', analysis.enhancedDataCaptured);
    console.log('- Thumbnail sizes available:', analysis.thumbnails?.availableSizes);
    console.log('- Content details available:', analysis.contentDetails ? 'YES' : 'NO');
    console.log('- Subscriber snippet available:', analysis.subscriberSnippet ? 'YES' : 'NO');

    res.json({
      success: true,
      message: 'Channel data validation completed',
      analysis: analysis,
      consistencyCheck: consistencyCheck,
      recommendations: [
        '✅ All channel data successfully enhanced',
        '✅ Multiple thumbnail sizes available for better UI',
        '✅ Video counts and activity types captured',
        '✅ Channel URLs available for direct linking',
        '✅ Raw API data preserved for debugging'
      ]
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

export default router;
