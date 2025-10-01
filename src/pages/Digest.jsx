import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

function Digest() {
  const [tags, setTags] = useState([])
  const [selections, setSelections] = useState([])
  const [watched, setWatched] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTag, setSelectedTag] = useState('')
  const [dateRange, setDateRange] = useState('30') // Default to 30 days
  const [lastUpdated, setLastUpdated] = useState(null)
  const [expandedCategories, setExpandedCategories] = useState({})
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Dark mode toggle function
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

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
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-load on mount
  useEffect(() => {
    console.log('🚀 Auto-load triggered (Digest mounted)')
    loadVideosForAllTags(true)
  }, [])

  // Auto-load when selections are ready
  useEffect(() => {
    if (selections.length > 0) {
      console.log('🚀 Auto-load triggered (selections ready)')
      loadVideosForAllTags(true)
    }
  }, [selections])

  const loadVideosForAllTags = async (useCache = false) => {
    try {
      // Check if any channels are selected
      const selectedChannels = selections.filter(s => s.selected)

      if (selectedChannels.length === 0) {
        console.log('Digest validation: No channels selected - showing empty state')
        setVideos([])
        return
      }

      console.log(`🎯 DIGEST DEBUG: loadVideosForAllTags called with useCache = ${useCache}`)
      console.log(`🎯 DIGEST DEBUG: Fetching videos for ${selectedChannels.length} selected channels`)
      console.log(`🎯 DIGEST DEBUG: Date range: ${dateRange} days`)

      try {
        // Calculate date range
        const endDate = new Date()
        const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000)

        const apiUrl = useCache
          ? '/api/digests/latest'  // Load cached digest
          : `/api/youtube/videos?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`

        console.log(`🎯 DIGEST DEBUG: API URL being called: ${apiUrl}`)
        console.log(`🎯 DIGEST DEBUG: useCache = ${useCache}, so this should load: ${useCache ? 'CACHED' : 'LIVE'} data`)

        const response = await fetch(apiUrl)
        if (response.ok) {
          const data = await response.json()

          // Handle case where cached data doesn't exist yet
          if (useCache && response.status === 404) {
            console.log('No cached data available, showing empty state')
            // Show empty state since no cached data exists yet
            setVideos([])
            return
          }

          const digestGroups = data.digest || []

          console.log(`Digest validation: Successfully loaded ${digestGroups.length} video groups`)

          // Calculate total videos across all groups (handle both old and new structure)
          const totalVideos = digestGroups.reduce((total, group) => {
            if (group.channels) {
              // New structure: group.channels[].videos[]
              return total + group.channels.reduce((chTotal, ch) => chTotal + ch.videos.length, 0)
            } else if (group.videos) {
              // Old structure: group.videos[]
              return total + group.videos.length
            }
            return total
          }, 0)
          console.log(`Digest validation: Total videos: ${totalVideos}`)

          // Log tag distribution (handle both old and new structure)
          digestGroups.forEach(group => {
            if (group.channels) {
              const groupVideos = group.channels.reduce((total, ch) => total + ch.videos.length, 0)
              console.log(`Digest validation: ${group.tagName} - ${groupVideos} videos across ${group.channels.length} channels`)
            } else if (group.videos) {
              console.log(`Digest validation: ${group.tagName} - ${group.videos.length} videos`)
            }
          })

          // Ensure all selected tags are represented, even if they have no videos
          const videosWithAllTags = [...digestGroups]

          // Add any missing tags as empty groups (handle both old and new structure)
          tags.forEach(tag => {
            const existingGroup = videosWithAllTags.find(group => group.tagId === tag.id)
            if (!existingGroup) {
              console.log(`Digest validation: Adding empty group for tag: ${tag.name}`)
              videosWithAllTags.push({
                tagId: tag.id,
                tagName: tag.name,
                channels: [] // New structure expects channels array
              })
            }
          })

          // Debug: Log what we're actually displaying
          console.log(`\n🎯 FRONTEND DEBUG - Final Display:`)
          videosWithAllTags.forEach(group => {
            const totalVideos = group.channels ? group.channels.reduce((total, ch) => total + ch.videos.length, 0) : 0
            console.log(`  📺 ${group.tagName}: ${totalVideos} videos across ${group.channels?.length || 0} channels`)

            if (group.channels) {
              group.channels.slice(0, 2).forEach(channel => {
                console.log(`    📡 ${channel.channelTitle}: ${channel.videos.length} videos`)
                if (channel.videos.length > 0) {
                  channel.videos.slice(0, 2).forEach(video => {
                    console.log(`      - "${video.title.substring(0, 40)}..." (${video.publishedAt.split('T')[0]})`)
                  })
                  if (channel.videos.length > 2) {
                    console.log(`      ... and ${channel.videos.length - 2} more`)
                  }
                }
              })
              if (group.channels.length > 2) {
                console.log(`    ... and ${group.channels.length - 2} more channels`)
              }
            }
          })

          // Sort by tag name for consistent display
          videosWithAllTags.sort((a, b) => a.tagName.localeCompare(b.tagName))

          console.log(`Digest validation: Final groups: ${videosWithAllTags.length} (including ${videosWithAllTags.filter(g => !g.channels || g.channels.length === 0).length} empty)`)
          console.log(`Digest validation: Data source: ${useCache ? 'CACHED' : 'LIVE'}`)

          setVideos(videosWithAllTags)

          // Use the actual cached timestamp from the API response
          if (data.cachedAt) {
            setLastUpdated(data.cachedAt)
          } else {
            // Fallback to current time if no cached timestamp (shouldn't happen with current API)
            setLastUpdated(new Date().toISOString())
          }
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
      console.log(`Digest: Refreshing with ${dateRange} day range`)

      // Load fresh data with current date range
      await loadVideosForAllTags(false) // Force fresh data load
    } catch (error) {
      console.error('Failed to refresh digest:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleDateRangeChange = (newRange) => {
    console.log(`Digest: Date range changed from ${dateRange} to ${newRange} days`)
    setDateRange(newRange)
    // Auto-refresh when date range changes
    setTimeout(() => {
      handleRefresh()
    }, 100)
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

  // Toggle category expansion
  const toggleCategoryExpansion = (tagId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [tagId]: !prev[tagId]
    }))
  }

  // Check if category is expanded (default to true if not set)
  const isCategoryExpanded = (tagId) => {
    return expandedCategories[tagId] !== false // Default to true
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] py-4">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="space-y-4">
          {/* Compact Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Video Digest</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Your curated videos organized by categories
            </p>
          </div>

          {/* Compact Controls Section */}
          <div className="bg-[var(--card-bg)] rounded-lg shadow-[var(--card-shadow)] p-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              {/* Date Range Filter - Updated Green Theme */}
              <div className="flex items-center space-x-4">
                <div className="bg-emerald-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Date Range</label>
                  <select
                    value={dateRange}
                    onChange={(e) => handleDateRangeChange(e.target.value)}
                    className="px-4 py-2 text-lg rounded-lg border-2 border-[var(--input-border)] focus:border-[var(--input-focus)] focus:ring-2 focus:ring-emerald-200 transition-all duration-200 bg-[var(--input-bg)] text-[var(--text-primary)]"
                  >
                    <option value="7">Last 7 days</option>
                    <option value="1">Last 24 hours</option>
                    <option value="30">Last 30 days</option>
                  </select>
                </div>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
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

            <div className="mt-4 p-4 bg-[var(--accent-bg)] rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <p className="text-sm text-[var(--text-secondary)] flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Showing videos from your selected channels organized by category
                </p>

                {/* Last Updated Indicator - Right Justified Two-Row */}
                <div className="flex items-center justify-end">
                  <div className="text-right">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <div className="flex flex-col items-center">
                        <span className="font-semibold">Last updated:</span>
                        <span>{lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'Never updated'}</span>
                        <span className="text-xs opacity-75">
                          {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          }) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* No Channels Selected */}
          {selections.filter(s => s.selected).length === 0 ? (
            <div className="bg-[var(--card-bg)] rounded-xl shadow-[var(--card-shadow)] p-16 text-center">
              <svg className="w-24 h-24 text-[var(--text-muted)] mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">No Channels Selected</h2>
              <p className="text-[var(--text-secondary)] text-lg mb-8 max-w-md mx-auto">
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
            <div className="bg-[var(--card-bg)] rounded-xl shadow-[var(--card-shadow)] p-16 text-center">
              <svg className="w-24 h-24 text-[var(--text-muted)] mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">No Categories Found</h2>
              <p className="text-[var(--text-secondary)] text-lg mb-8 max-w-md mx-auto">
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
            <div className="bg-[var(--card-bg)] rounded-xl shadow-[var(--card-shadow)] p-16 text-center">
              <svg className="w-24 h-24 text-[var(--text-muted)] mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">No Videos Found</h2>
              <p className="text-[var(--text-secondary)] text-lg mb-8 max-w-md mx-auto">
                No new videos found in the selected date range for your chosen channels
              </p>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Digest
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {videos.map((tagGroup) => {
                const totalVideos = tagGroup.channels ? tagGroup.channels.reduce((total, ch) => total + ch.videos.length, 0) : 0;

                return (
                  <div key={tagGroup.tagId} className="bg-[var(--card-bg)] rounded-lg shadow-[var(--card-shadow)] overflow-hidden">
                    {/* Compact Category Header - New Green Theme */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="bg-white bg-opacity-20 p-2 rounded-full">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-white">{tagGroup.tagName}</h2>
                            <p className="text-emerald-100 text-sm mt-1">{totalVideos} videos • {tagGroup.channels?.length || 0} channels</p>
                          </div>
                        </div>

                        {/* Expand/Collapse Button */}
                        <button
                          onClick={() => toggleCategoryExpansion(tagGroup.tagId)}
                          className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-full transition-all duration-200 transform hover:scale-110"
                        >
                          <svg
                            className={`w-5 h-5 text-white transition-transform duration-200 ${isCategoryExpanded(tagGroup.tagId) ? 'rotate-0' : 'rotate-180'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Channel Sections - Only show if expanded */}
                    {isCategoryExpanded(tagGroup.tagId) && (
                      <div className="p-4 space-y-4">
                        {tagGroup.channels?.map((channel) => (
                          <div key={channel.channelId} className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                            {/* Channel Header */}
                            <div className="bg-[var(--accent-bg)] px-3 py-2 border-b border-[var(--border-color)]">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <img
                                    src={channel.channelThumbnail || '/placeholder-channel.png'}
                                    alt={channel.channelTitle}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                  <span className="text-sm font-medium text-[var(--text-primary)]">{channel.channelTitle}</span>
                                  <span className="text-xs text-[var(--text-muted)]">({channel.videos.length} videos)</span>
                                </div>

                                {/* Reserved Action Button Space */}
                                <div className="flex items-center space-x-2">
                                  <button className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-2 py-1 rounded">
                                    ⋯
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Channel Video Rail */}
                            <div className="p-3">
                              <div className="flex gap-3 overflow-x-auto pb-2">
                                {channel.videos.map((video) => (
                                  <div key={video.videoId} className="video-card flex-none w-48 group">
                                    <div className="bg-[var(--accent-bg)] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                                      {/* Video Thumbnail */}
                                      <div className="relative aspect-video bg-[var(--border-color)] group-hover:bg-gray-300 transition-colors">
                                        <img
                                          src={video.thumbnail}
                                          alt={video.title}
                                          className="w-full h-full object-cover"
                                        />
                                        {isVideoWatched(video.videoId) && (
                                          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                                            <div className="bg-green-500 text-white p-2 rounded-full">
                                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                              </svg>
                                            </div>
                                          </div>
                                        )}
                                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1 py-0.5 rounded">
                                          12:34
                                        </div>
                                        {/* YT Badge - commented out for now
                                        <div className="absolute top-1 left-1 bg-red-600 text-white text-xs px-1 py-0.5 rounded font-semibold">
                                          YT
                                        </div>
                                        */}
                                      </div>

                                      {/* Video Info */}
                                      <div className="p-2">
                                        <h3 className="font-medium text-[var(--text-primary)] line-clamp-2 text-sm leading-tight mb-1">
                                          {video.title}
                                        </h3>
                                        <p className="text-xs text-[var(--text-secondary)] mb-1">{new Date(video.publishedAt).toLocaleDateString()}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{video.viewCount} views</p>

                                        {/* Compact Action Buttons */}
                                        <div className="flex gap-1 mt-2">
                                          <button
                                            onClick={() => playVideo(video.videoId)}
                                            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-1.5 px-2 rounded text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1"
                                          >
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                            </svg>
                                            Play
                                          </button>
                                          <button
                                            onClick={() => markAsWatched(video.videoId)}
                                            disabled={isVideoWatched(video.videoId)}
                                            className={`px-2 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                                              isVideoWatched(video.videoId)
                                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                                : 'bg-gray-600 hover:bg-gray-700 text-white'
                                            }`}
                                          >
                                            {isVideoWatched(video.videoId) ? (
                                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                              </svg>
                                            ) : (
                                              '✓'
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
                  </div>
                );
              })}
            </div>
          )}

          {/* Compact Navigation Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t border-[var(--border-color)] bg-[var(--card-bg)] rounded-lg p-3 shadow-[var(--card-shadow)]">
            <Link
              to="/channels"
              className="flex items-center text-blue-600 hover:text-blue-800 font-semibold text-sm transition-colors group"
            >
              <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Channel Picker
            </Link>

            <div className="flex items-center text-[var(--text-muted)] bg-[var(--accent-bg)] px-2 py-1 rounded">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs">Updated {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Digest
