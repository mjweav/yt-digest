import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

function ChannelPicker() {
  const [channels, setChannels] = useState([])
  const [tags, setTags] = useState([])
  const [selections, setSelections] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creatingTag, setCreatingTag] = useState(false)
  const [activeLetter, setActiveLetter] = useState(null)
  const [toastMessage, setToastMessage] = useState('')
  const [showMobileModal, setShowMobileModal] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [expandedDescriptions, setExpandedDescriptions] = useState({})
  const [isDarkMode, setIsDarkMode] = useState(false)
  const channelListRef = useRef(null)

  // Dark mode toggle function
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  // Load data on component mount
  useEffect(() => {
    loadData()

    // Check for OAuth success/error in URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const oauthSuccess = urlParams.get('oauth')
    const oauthError = urlParams.get('error')

    if (oauthSuccess === 'success') {
      console.log('OAuth: Success! User authenticated with Google')
      // Show success message
      setTimeout(() => {
        alert('✅ Successfully connected to YouTube! You can now fetch your subscriptions.')
      }, 1000)
    } else if (oauthError) {
      console.error('OAuth: Error from callback:', oauthError)
      // Show error message
      setTimeout(() => {
        alert(`❌ OAuth Error: ${decodeURIComponent(oauthError)}`)
      }, 1000)
    }

    // Clean URL parameters
    if (oauthSuccess || oauthError) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [channelsRes, tagsRes, selectionsRes] = await Promise.all([
        fetch('/api/channels'),
        fetch('/api/tags'),
        fetch('/api/selections')
      ])

      if (channelsRes.ok) {
        const channelsData = await channelsRes.json()
        console.log('🔍 DEBUG: Raw channels data structure:', {
          type: typeof channelsData,
          isArray: Array.isArray(channelsData),
          length: channelsData?.length,
          firstItem: channelsData?.[0] ? {
            id: channelsData[0].id,
            title: channelsData[0].title,
            hasThumbnails: !!channelsData[0].thumbnails,
            thumbnailsType: typeof channelsData[0].thumbnails,
            thumbnailKeys: channelsData[0].thumbnails ? Object.keys(channelsData[0].thumbnails) : []
          } : null
        })
        setChannels(channelsData)
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json()
        setTags(tagsData)
      }

      if (selectionsRes.ok) {
        const selectionsData = await selectionsRes.json()
        setSelections(selectionsData.selections || [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveChannelSelections = async () => {
    try {
      setSaving(true)

      const response = await fetch('/api/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections: selections
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`Saved ${result.selectionsCount} channel selections`)

        // Show success feedback
        alert(`✅ Saved! ${result.selectedCount} channels selected for digest`)
      } else {
        throw new Error('Failed to save selections')
      }
    } catch (error) {
      console.error('Error saving selections:', error)
      alert('❌ Failed to save selections. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleChannelSelection = (channelId) => {
    const channel = channels.find(c => c.id === channelId)
    const wasSelected = selections.some(s => s.channelId === channelId)

    setSelections(prev =>
      prev.some(s => s.channelId === channelId)
        ? prev.filter(s => s.channelId !== channelId)
        : [...prev, { channelId, selected: true }]
    )

    // Validation logging
    if (wasSelected) {
      console.log(`Channel Picker validation: Deselected channel: ${channel?.title || channelId}`)
    } else {
      console.log(`Channel Picker validation: Selected channel: ${channel?.title || channelId}`)
    }
  }

  const isChannelSelected = (channelId) => {
    return selections.some(s => s.channelId === channelId)
  }



  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/youtube/subscriptions')

      if (response.ok) {
        const data = await response.json()
        setChannels(data.subscriptions || [])

        console.log(`Channel Picker validation: Loaded ${data.count} subscriptions across ${data.pages || 1} pages`)
        console.log(`Channel Picker validation: First few channels:`, data.subscriptions?.slice(0, 3).map(c => c.title))

        if (data.count > 50) {
          console.log(`Channel Picker validation: ✅ Successfully loaded all ${data.count} subscriptions (more than 50, paging worked!)`)
        }
      } else {
        const errorData = await response.json()
        console.error('Channel Picker validation: Failed to fetch subscriptions:', errorData.error)

        if (response.status === 401) {
          alert('Authentication required. Please connect your YouTube account first.')
        }
      }
    } catch (error) {
      console.error('Channel Picker validation: Error fetching subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  const createTag = async (tagName) => {
    if (!tagName.trim()) return null

    try {
      const newTag = {
        id: `tag_${Date.now()}`,
        name: tagName.trim()
      }

      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([...tags, newTag])
      })

      if (response.ok) {
        const updatedTags = [...tags, newTag]
        setTags(updatedTags)
        return newTag
      }
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
    return null
  }

  const assignChannelToTag = async (channelId, tagId) => {
    try {
      // Find existing selection for this channel
      const existingSelectionIndex = selections.findIndex(s => s.channelId === channelId)

      let updatedSelections
      if (existingSelectionIndex >= 0) {
        // Update existing selection
        updatedSelections = [...selections]
        updatedSelections[existingSelectionIndex] = {
          ...updatedSelections[existingSelectionIndex],
          tagId: tagId
        }
      } else {
        // Create new selection
        const newSelection = { channelId, selected: true, tagId }
        updatedSelections = [...selections, newSelection]
      }

      console.log('Sending selections:', updatedSelections)

      const response = await fetch('/api/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections: updatedSelections
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Server response:', result)
        setSelections(updatedSelections)
      } else {
        const errorData = await response.json()
        console.error('Server error:', errorData)
        alert(`❌ Failed to save: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Failed to assign channel to tag:', error)
      alert('❌ Network error. Please try again.')
    }
  }

  const removeChannelFromTag = async (channelId, tagId) => {
    try {
      // Find the selection for this channel
      const existingSelection = selections.find(s => s.channelId === channelId)

      if (!existingSelection) {
        console.log('No selection found for channel:', channelId)
        return
      }

      // If this selection has the tag we're trying to remove, clear the tagId
      let updatedSelections
      if (existingSelection.tagId === tagId) {
        // Remove the tagId but keep the channel selected
        updatedSelections = selections.map(s =>
          s.channelId === channelId
            ? { ...s, tagId: null }
            : s
        )
      } else {
        // If the selection doesn't have this tag, just filter it out (fallback)
        updatedSelections = selections.filter(
          s => !(s.channelId === channelId && s.tagId === tagId)
        )
      }

      console.log('Removing channel from tag:', { channelId, tagId, updatedSelections })

      const response = await fetch('/api/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections: updatedSelections
        })
      })

      if (response.ok) {
        setSelections(updatedSelections)
        console.log('Successfully removed channel from tag')
      } else {
        const errorData = await response.json()
        console.error('Server error removing channel from tag:', errorData)
      }
    } catch (error) {
      console.error('Failed to remove channel from tag:', error)
    }
  }

  const getChannelsForTag = (tagId) => {
    return channels.filter(channel =>
      selections.some(selection =>
        selection.channelId === channel.id && selection.tagId === tagId
      )
    )
  }

  // Alphabet navigation functions
  const getSortedChannels = () => {
    return [...channels].sort((a, b) => {
      const titleA = a.title.toLowerCase()
      const titleB = b.title.toLowerCase()
      return titleA.localeCompare(titleB)
    })
  }

  const getFirstLetter = (title) => {
    const firstChar = title.charAt(0).toUpperCase()
    return /[A-Z]/.test(firstChar) ? firstChar : '#'
  }

  const scrollToLetter = (letter) => {
    setActiveLetter(letter)

    // Find the first channel that starts with this letter
    const sortedChannels = getSortedChannels()
    const targetChannel = sortedChannels.find(channel => {
      const channelLetter = getFirstLetter(channel.title)
      return channelLetter === letter
    })

    if (targetChannel) {
      const element = document.getElementById(`channel-${targetChannel.id}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } else {
      // Show toast message for no channels with this letter
      setToastMessage(`No channels starting with "${letter}"`)
      setTimeout(() => setToastMessage(''), 3000)
    }
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      {/* True Header - Fixed */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-[var(--card-bg)] shadow-[var(--card-shadow)] border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link
                to="/"
                className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-emerald-700 transition-all duration-300"
              >
                🎬 YT-Digest
              </Link>
            </div>

            <div className="flex items-center space-x-2">
              {/* Dark Mode Toggle Button */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-[var(--accent-bg)] hover:bg-[var(--border-color)] transition-all duration-200 flex items-center justify-center"
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <SunIcon className="w-5 h-5 text-[var(--text-secondary)]" />
                ) : (
                  <MoonIcon className="w-5 h-5 text-[var(--text-secondary)]" />
                )}
              </button>

              <Link
                to="/settings"
                className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--accent-bg)] border border-[var(--border-color)] hover:border-[var(--border-hover)]"
              >
                ⚙️ Settings
              </Link>
              <Link
                to="/channels"
                className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg"
              >
                📺 Channel Picker
              </Link>
              <Link
                to="/digest"
                className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 transform hover:scale-105 bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--accent-bg)] border-2 border-[var(--border-color)] hover:border-[var(--border-hover)]"
              >
                🎯 Digest
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Selection Panel - Fixed */}
      {channels.length > 0 && (
        <div className="fixed top-20 left-0 right-0 z-20 bg-[var(--card-bg)] border-b border-[var(--border-color)] shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-100 p-3 rounded-full">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Channel Selection</h3>
                    <p className="text-[var(--text-secondary)]">
                      {selections.length} of {channels.length} channels selected for digest
                    </p>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      // First refresh the channel data from YouTube API
                      await fetchSubscriptions();

                      // Then do thumbnail analysis on the refreshed data
                      console.log('🔍 DEBUG: All channels thumbnail analysis after refresh:');
                      const brokenChannels = channels.filter(channel => {
                        const hasThumbnails = channel.thumbnails && (
                          channel.thumbnails.medium?.url ||
                          channel.thumbnails.high?.url ||
                          channel.thumbnails.default?.url ||
                          channel.thumbnails.standard?.url ||
                          channel.thumbnails.maxres?.url
                        );
                        const hasLegacyThumbnail = channel.thumbnail;

                        if (!hasThumbnails && !hasLegacyThumbnail) {
                          console.log(`❌ BROKEN: "${channel.title}" - No thumbnails available`);
                          console.log('Channel data:', channel);
                          return true;
                        }
                        return false;
                      });

                      const workingChannels = channels.filter(channel => {
                        const hasThumbnails = channel.thumbnails && (
                          channel.thumbnails.medium?.url ||
                          channel.thumbnails.high?.url ||
                          channel.thumbnails.default?.url ||
                          channel.thumbnails.standard?.url ||
                          channel.thumbnails.maxres?.url
                        );
                        return hasThumbnails;
                      });

                      console.log(`✅ WORKING: ${workingChannels.length} channels with enhanced thumbnails`);
                      console.log(`❌ BROKEN: ${brokenChannels.length} channels without thumbnails`);
                      console.log('🔍 Full channel list with thumbnail status:');
                      channels.forEach(channel => {
                        const hasEnhanced = channel.thumbnails && (
                          channel.thumbnails.medium?.url ||
                          channel.thumbnails.high?.url ||
                          channel.thumbnails.default?.url ||
                          channel.thumbnails.standard?.url ||
                          channel.thumbnails.maxres?.url
                        );
                        const hasLegacy = !!channel.thumbnail;
                        console.log(`"${channel.title}": enhanced=${!!hasEnhanced}, legacy=${!!hasLegacy}`);
                      });

                      if (brokenChannels.length > 0) {
                        alert(`✅ Channel data refreshed! Found ${brokenChannels.length} channels with missing thumbnails. Check console for details.`);
                      } else {
                        alert(`✅ Channel data refreshed successfully! All ${channels.length} channels have thumbnails and proper URLs.`);
                      }
                    } catch (error) {
                      console.error('Error refreshing channel data:', error);
                      alert('❌ Failed to refresh channel data. Please try again.');
                    }
                  }}
                  className="bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-1"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={saveChannelSelections}
                disabled={saving || selections.length === 0}
                className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Selection ({selections.length})
                  </>
                )}
              </button>
            </div>

            {selections.length > 0 && (
              <div className="mt-4 p-3 bg-[var(--success-bg)] rounded-lg border border-[var(--success-border)]">
                <p className="text-sm text-[var(--success-text)] flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {selections.length} channels selected - These will appear in your video digest
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Channel List - Scrollable */}
      <div className="relative flex-1 overflow-y-auto bg-[var(--page-bg)] pt-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Available Channels */}
          <div className="bg-[var(--card-bg)] rounded-xl shadow-[var(--card-shadow)] p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                Available Channels
              </h2>
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {channels.length} channels
                </span>
                {selections.length > 0 && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {selections.length} selected
                  </span>
                )}
              </div>
            </div>

            {channels.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-[var(--text-secondary)] text-lg mb-2">No channels available</p>
                <p className="text-[var(--text-muted)]">Connect your YouTube account to get started</p>
              </div>
            ) : (
              <>
                {/* Channel List */}
                <div ref={channelListRef} className="space-y-6">
                  {getSortedChannels().map((channel) => {
                    const selected = isChannelSelected(channel.id)
                    const assignedTag = selections.find(s => s.channelId === channel.id)?.tagId
                    const assignedTagName = assignedTag ? tags.find(t => t.id === assignedTag)?.name : null

                    return (
                      <div
                        key={channel.id}
                        id={`channel-${channel.id}`}
                        className={`border-2 rounded-lg transition-all duration-200 ${
                          selected
                            ? 'border-green-400 bg-[var(--success-bg)] hover:bg-green-100'
                            : 'border-[var(--border-color)] hover:border-[var(--border-hover)] hover:bg-[var(--accent-bg)]'
                        }`}
                      >
                        {/* Channel Header */}
                        <div className={`p-4 ${selected ? 'bg-gradient-to-r from-blue-50 to-emerald-50' : 'cursor-pointer hover:bg-[var(--accent-bg)]'}`} onClick={() => toggleChannelSelection(channel.id)}>
                          <div className="flex items-start space-x-4">
                            {/* Selection Checkbox/Indicator - Left aligned */}
                            <div className="flex-shrink-0 pt-1">
                              {selected ? (
                                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-2 rounded-full shadow-md">
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-7 h-7"></div>
                              )}
                            </div>

                            {/* Clickable Identity Section */}
                            <div className="flex items-start space-x-4 flex-1">
                              {/* Clickable Avatar */}
                              {channel.channelUrl ? (
                                <a
                                  href={channel.channelUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <img
                                    src={channel.thumbnails?.medium?.url || channel.thumbnails?.default?.url || '/placeholder-channel.png'}
                                    alt={channel.title}
                                    className="w-16 h-16 rounded-full object-cover hover:ring-2 hover:ring-blue-400 transition-all duration-200"
                                  />
                                </a>
                              ) : (
                                <img
                                  src={channel.thumbnails?.medium?.url || channel.thumbnails?.default?.url || '/placeholder-channel.png'}
                                  alt={channel.title}
                                  className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                                />
                              )}

                              {/* Channel Info */}
                              <div className="flex-1 min-w-0">
                                {/* Clickable Title */}
                                <div className="mb-2">
                                  {channel.channelUrl ? (
                                    <a
                                      href={channel.channelUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`font-semibold text-lg hover:text-blue-600 hover:underline cursor-pointer transition-all duration-200 block ${selected ? 'text-emerald-900' : 'text-[var(--text-primary)]'}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {channel.title}
                                    </a>
                                  ) : (
                                    <p className={`font-semibold text-lg ${selected ? 'text-emerald-900' : 'text-[var(--text-primary)]'}`}>
                                      {channel.title}
                                    </p>
                                  )}
                                </div>

                                {/* Metadata Badges Row */}
                                <div className="inline-flex gap-2 items-center mt-1 mb-2">
                                  {/* Total Videos Badge */}
                                  {channel.contentDetails?.totalItemCount && (
                                    <span className="bg-[var(--accent-bg)] text-[var(--text-secondary)] rounded px-2 py-0.5 text-xs font-medium">
                                      📊 {channel.contentDetails.totalItemCount.toLocaleString()} videos
                                    </span>
                                  )}

                                  {/* Since Year Badge */}
                                  {channel.publishedAt && (
                                    <span className="bg-green-100 text-green-800 rounded px-2 py-0.5 text-xs font-medium">
                                      📅 Since {new Date(channel.publishedAt).getFullYear()}
                                    </span>
                                  )}
                                </div>

                                {/* Expandable Description */}
                                <div className="mb-2">
                                  <p className={`text-sm text-[var(--text-muted)] ${expandedDescriptions[channel.id] ? '' : 'line-clamp-2'}`}>
                                    {channel.description}
                                  </p>

                                  {/* Expand/Collapse Button - Only show if description > 100 characters */}
                                  {channel.description && channel.description.length > 100 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setExpandedDescriptions(prev => ({
                                          ...prev,
                                          [channel.id]: !prev[channel.id]
                                        }))
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-800 mt-1 font-medium transition-colors"
                                      aria-expanded={expandedDescriptions[channel.id] || false}
                                    >
                                      {expandedDescriptions[channel.id] ? '▲ Less' : '▼ More'}
                                    </button>
                                  )}
                                </div>

                                {/* Selection Status */}
                                {selected && (
                                  <p className="text-xs text-emerald-600 font-medium">
                                    ✓ Selected for digest
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Tag Assignment Section */}
                        {selected && (
                          <div className="px-4 pb-4 border-t border-[var(--border-color)] bg-[var(--card-bg)]">
                            <div className="mt-4">
                              <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Assign to Category:</p>

                              {/* Tag Chips */}
                              <div className="flex flex-wrap gap-2">
                                {/* Existing Tags */}
                                {tags.map((tag) => {
                                  const isAssigned = assignedTag === tag.id
                                  return (
                                    <button
                                      key={tag.id}
                                      onClick={() => {
                                        if (isAssigned) {
                                          // Remove assignment
                                          removeChannelFromTag(channel.id, tag.id)
                                        } else {
                                          // Assign to this tag
                                          assignChannelToTag(channel.id, tag.id)
                                        }
                                      }}
                                      className={`px-2 py-1 rounded-full text-xs font-semibold transition-all duration-200 shadow-md transform ${
                                        isAssigned
                                          ? 'bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-500 text-white shadow-yellow-200 scale-105 ring-1 ring-purple-300 ring-opacity-50 hover:scale-110'
                                          : 'bg-[var(--accent-bg)] text-[var(--text-secondary)] hover:bg-[var(--border-color)] border border-[var(--border-color)] hover:border-[var(--border-hover)] hover:scale-102'
                                      }`}
                                      style={isAssigned ? {
                                        background: 'linear-gradient(to right, #fbbf24, #f472b6, #a855f7)',
                                        boxShadow: '0 4px 6px -1px rgba(251, 191, 36, 0.2), 0 2px 4px -1px rgba(251, 191, 36, 0.1)'
                                      } : {}}
                                    >
                                      {tag.name}
                                      {isAssigned && (
                                        <svg className="w-4 h-4 ml-2 inline" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </button>
                                  )
                                })}

                                {/* Create New Tag Chip */}
                                <button
                                  onClick={async () => {
                                    const tagName = prompt('Enter new category name (max 20 characters):')
                                    if (tagName) {
                                      // Validate length
                                      if (tagName.length > 20) {
                                        alert('❌ Category name must be 20 characters or less')
                                        return
                                      }
                                      if (tagName.trim().length === 0) {
                                        alert('❌ Category name cannot be empty')
                                        return
                                      }

                                      const newTag = await createTag(tagName.trim())
                                      if (newTag) {
                                        await assignChannelToTag(channel.id, newTag.id)
                                      }
                                    }
                                  }}
                                  className="px-2 py-1 rounded-full text-xs font-medium bg-dashed border-2 border-dashed border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--accent-bg)] transition-all duration-200"
                                >
                                  <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  + Tag
                                </button>
                              </div>

                              {/* Assignment Status */}
                              {assignedTagName && (
                                <div className="mt-3 p-2 bg-[var(--success-bg)] rounded-lg border border-[var(--success-border)]">
                                  <p className="text-xs text-[var(--success-text)] flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    ✓ Assigned to <span className="font-semibold ml-1">{assignedTagName}</span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* A-Z Button - Always Visible */}
                <button
                  onClick={() => setShowMobileModal(true)}
                  className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex items-center justify-center z-40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50"
                  aria-label="Open alphabet navigation"
                >
                  <span className="text-sm font-bold">A-Z</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile Alphabet Modal */}
          {showMobileModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-[var(--card-bg)] rounded-xl shadow-[var(--card-shadow)] w-full max-w-sm mx-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Jump to Letter</h3>
                  <button
                    onClick={() => setShowMobileModal(false)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                    aria-label="Close alphabet navigation"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Alphabet Grid */}
                <div className="p-6">
                  <div className="grid grid-cols-5 gap-3">
                    {alphabet.map((letter) => (
                      <button
                        key={letter}
                        onClick={() => {
                          scrollToLetter(letter)
                          setShowMobileModal(false)
                        }}
                        className={`w-12 h-12 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 ${
                          activeLetter === letter
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg'
                            : 'bg-[var(--accent-bg)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
                        }`}
                        title={`Jump to channels starting with ${letter}`}
                        aria-label={`Jump to channels starting with ${letter}`}
                      >
                        {letter}
                      </button>
                    ))}

                    {/* # Button */}
                    <button
                      onClick={() => {
                        scrollToLetter('#')
                        setShowMobileModal(false)
                      }}
                      className={`w-12 h-12 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 ${
                        activeLetter === '#'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg'
                          : 'bg-[var(--accent-bg)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
                      }`}
                      title="Jump to channels starting with numbers or symbols"
                      aria-label="Jump to channels starting with numbers or symbols"
                    >
                      #
                    </button>
                  </div>

                  {/* Instructions */}
                  <p className="text-xs text-[var(--text-muted)] text-center mt-4">
                    Tap any letter to jump to channels starting with that letter
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  )
}

export default ChannelPicker
