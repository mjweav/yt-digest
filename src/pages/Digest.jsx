import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function Digest() {
  const [tags, setTags] = useState([])
  const [selections, setSelections] = useState([])
  const [watched, setWatched] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTag, setSelectedTag] = useState('')

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [tagsRes, selectionsRes, watchedRes] = await Promise.all([
        fetch('/api/tags'),
        fetch('/api/selections'),
        fetch('/api/watched')
      ])

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json()
        setTags(tagsData)
      }

      if (selectionsRes.ok) {
        const selectionsData = await selectionsRes.json()
        setSelections(selectionsData.selections || [])
      }

      if (watchedRes.ok) {
        const watchedData = await watchedRes.json()
        setWatched(watchedData)
      }

      // Load videos for all tags
      await loadVideosForAllTags()
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadVideosForAllTags = async () => {
    try {
      // Check if any channels are selected
      const selectedChannels = selections.filter(s => s.selected)

      if (selectedChannels.length === 0) {
        console.log('Digest validation: No channels selected - showing empty state')
        setVideos([])
        return
      }

      console.log(`Digest validation: Fetching videos for ${selectedChannels.length} selected channels`)

      try {
        const response = await fetch('/api/youtube/videos')
        if (response.ok) {
          const data = await response.json()
          const digestGroups = data.digest || []

          console.log(`Digest validation: Successfully loaded ${digestGroups.length} video groups`)
          console.log(`Digest validation: Total videos: ${digestGroups.reduce((total, group) => total + group.videos.length, 0)}`)

          // Log tag distribution
          digestGroups.forEach(group => {
            console.log(`Digest validation: ${group.tagName} - ${group.videos.length} videos`)
          })

          // Ensure all selected tags are represented, even if they have no videos
          const videosWithAllTags = [...digestGroups]

          // Add any missing tags as empty groups
          tags.forEach(tag => {
            const existingGroup = videosWithAllTags.find(group => group.tagId === tag.id)
            if (!existingGroup) {
              console.log(`Digest validation: Adding empty group for tag: ${tag.name}`)
              videosWithAllTags.push({
                tagId: tag.id,
                tagName: tag.name,
                videos: []
              })
            }
          })

          // Sort by tag name for consistent display
          videosWithAllTags.sort((a, b) => a.tagName.localeCompare(b.tagName))

          console.log(`Digest validation: Final groups: ${videosWithAllTags.length} (including ${videosWithAllTags.filter(g => g.videos.length === 0).length} empty)`)

          setVideos(videosWithAllTags)
        } else {
          console.error('Digest validation: Failed to load videos from API')
          setVideos([])
        }
      } catch (error) {
        console.error('Digest validation: Error loading videos:', error)
        setVideos([])
      }
    } catch (error) {
      console.error('Digest validation: Failed to load videos for tags:', error)
    }
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      // In the real implementation, this would:
      // 1. Fetch latest videos from YouTube API for selected channels
      // 2. Filter by date range (last 7 days)
      // 3. Update the digest with new content

      await loadData() // For now, just reload existing data
    } catch (error) {
      console.error('Failed to refresh digest:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const markAsWatched = async (videoId) => {
    try {
      const watchedItem = {
        videoId,
        userId: 'current-user', // In real app, get from auth context
        watchedAt: new Date().toISOString()
      }

      const response = await fetch('/api/watched', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(watchedItem)
      })

      if (response.ok) {
        setWatched([...watched, watchedItem])
      }
    } catch (error) {
      console.error('Failed to mark video as watched:', error)
    }
  }

  const isVideoWatched = (videoId) => {
    return watched.some(w => w.videoId === videoId)
  }

  const playVideo = (videoId) => {
    // In real implementation, this would open YouTube
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')
    markAsWatched(videoId)
  }

  // Helper function to format video duration
  const formatDuration = (duration) => {
    // Simple duration formatting - in real app would use a library
    return duration.replace('PT', '').toLowerCase()
  }

  // Helper function to format view count
  const formatViewCount = (viewCount) => {
    const count = parseInt(viewCount)
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`
    }
    return `${count} views`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Video Digest</h1>
            <p className="text-xl text-gray-600">
              Your curated videos organized by categories (Last 30 days)
            </p>
          </div>

          {/* Controls Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              {/* Date Range Filter */}
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <select className="px-4 py-2 text-lg rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200">
                    <option>Last 7 days</option>
                    <option>Last 24 hours</option>
                    <option>Last 30 days</option>
                  </select>
                </div>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                {refreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    Refreshing Digest...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Digest
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Showing videos from your selected channels organized by category
              </p>
            </div>
          </div>

          {/* No Channels Selected */}
          {selections.filter(s => s.selected).length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-16 text-center">
              <svg className="w-24 h-24 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Channels Selected</h2>
              <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                Please pick some channels in the Channel Picker to see your personalized video digest
              </p>
              <Link
                to="/channels"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-lg rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Go to Channel Picker
              </Link>
            </div>
          ) : tags.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-16 text-center">
              <svg className="w-24 h-24 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Categories Found</h2>
              <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                Create categories and assign channels in the Channel Picker to see your personalized video digest
              </p>
              <Link
                to="/channels"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-lg rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Go to Channel Picker
              </Link>
            </div>
          ) : videos.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-16 text-center">
              <svg className="w-24 h-24 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Videos Found</h2>
              <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                No new videos found in the selected date range for your chosen channels
              </p>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-lg rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Digest
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              {videos.map((tagGroup) => (
                <div key={tagGroup.tagId} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  {/* Category Header */}
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-white bg-opacity-20 p-3 rounded-full">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold text-white">{tagGroup.tagName}</h2>
                          <p className="text-purple-100 mt-1">{tagGroup.videos.length} videos in this category</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Rail */}
                  <div className="p-8">
                    <div className="video-rail flex gap-6 overflow-x-auto pb-4">
                      {tagGroup.videos.map((video) => (
                        <div key={video.videoId} className="video-card flex-none w-80 group">
                          <div className="bg-gray-100 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-2">
                            {/* Video Thumbnail */}
                            <div className="relative aspect-video bg-gray-200 group-hover:bg-gray-300 transition-colors">
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                              {isVideoWatched(video.videoId) && (
                                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                                  <div className="bg-green-500 text-white p-4 rounded-full">
                                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                              <div className="absolute bottom-3 right-3 bg-black bg-opacity-80 text-white text-sm px-2 py-1 rounded">
                                12:34
                              </div>
                              <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 rounded font-semibold">
                                YouTube
                              </div>
                            </div>

                            {/* Video Info */}
                            <div className="p-6">
                              <h3 className="font-bold text-gray-900 line-clamp-2 mb-3 text-lg leading-tight">
                                {video.title}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">{video.channelTitle}</p>
                              <p className="text-xs text-gray-500 mb-4">
                                {new Date(video.publishedAt).toLocaleDateString()} • {video.viewCount}
                              </p>

                              {/* Action Buttons */}
                              <div className="flex gap-3">
                                <button
                                  onClick={() => playVideo(video.videoId)}
                                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                  </svg>
                                  Play Video
                                </button>
                                <button
                                  onClick={() => markAsWatched(video.videoId)}
                                  disabled={isVideoWatched(video.videoId)}
                                  className={`px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                                    isVideoWatched(video.videoId)
                                      ? 'bg-green-500 hover:bg-green-600 text-white shadow-md'
                                      : 'bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg'
                                  }`}
                                >
                                  {isVideoWatched(video.videoId) ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    'Mark Watched'
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Navigation Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-gray-200 bg-white rounded-xl p-8 shadow-lg">
            <Link
              to="/channels"
              className="flex items-center text-blue-600 hover:text-blue-800 font-semibold text-lg transition-colors group"
            >
              <svg className="w-6 h-6 mr-3 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Channel Picker
            </Link>

            <div className="flex items-center text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">Updated {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Digest
