import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

function Settings() {
  const [authStatus, setAuthStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const navigate = useNavigate()

  // Dark mode toggle function
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  // Load authentication status on component mount
  useEffect(() => {
    checkAuthStatus()

    // Check for OAuth success/error in URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const oauthSuccess = urlParams.get('oauth')
    const oauthError = urlParams.get('error')

    if (oauthSuccess === 'success') {
      console.log('Settings: OAuth success detected')
      setTimeout(() => {
        alert('✅ Successfully connected to YouTube!')
        checkAuthStatus() // Refresh auth status
      }, 1000)
    } else if (oauthError) {
      console.error('Settings: OAuth error:', oauthError)
      setTimeout(() => {
        alert(`❌ OAuth Error: ${decodeURIComponent(oauthError)}`)
      }, 1000)
    }

    // Clean URL parameters
    if (oauthSuccess || oauthError) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const checkAuthStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/status')

      if (response.ok) {
        const data = await response.json()
        setAuthStatus(data)
        console.log('Settings: Auth status loaded:', data)
      } else {
        console.error('Settings: Failed to check auth status')
        setAuthStatus({ connected: false })
      }
    } catch (error) {
      console.error('Settings: Error checking auth status:', error)
      setAuthStatus({ connected: false })
    } finally {
      setLoading(false)
    }
  }

  const handleConnectGoogle = async () => {
    try {
      setOauthLoading(true)
      const response = await fetch('/api/auth/google/url')

      if (response.ok) {
        const data = await response.json()
        console.log('Settings: Redirecting to Google OAuth...')
        window.location.href = data.authUrl
      } else {
        console.error('Settings: Failed to get OAuth URL')
        alert('❌ Failed to connect to Google. Please try again.')
      }
    } catch (error) {
      console.error('Settings: Error getting OAuth URL:', error)
      alert('❌ Network error. Please check your connection and try again.')
    } finally {
      setOauthLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from YouTube? You\'ll need to reconnect to fetch subscriptions again.')) {
      return
    }

    try {
      setDisconnecting(true)
      const response = await fetch('/api/auth/disconnect', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Settings: Disconnected successfully')
        alert('✅ Successfully disconnected from YouTube')
        setAuthStatus({ connected: false })
      } else {
        console.error('Settings: Failed to disconnect')
        alert('❌ Failed to disconnect. Please try again.')
      }
    } catch (error) {
      console.error('Settings: Error disconnecting:', error)
      alert('❌ Network error. Please try again.')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleContinueToApp = () => {
    navigate('/channels')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">Settings</h1>
            <p className="text-xl text-[var(--text-secondary)]">
              Manage your YouTube account connection
            </p>
          </div>

          {/* YouTube Connection Section */}
          <div className="bg-[var(--card-bg)] rounded-xl shadow-[var(--card-shadow)] p-8 border-l-4 border-blue-500">
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">YouTube Account</h2>
                <p className="text-[var(--text-secondary)] mt-1">Connect your YouTube account to access your subscriptions</p>
              </div>
            </div>

            {authStatus?.connected ? (
              // Connected State
              <div className="space-y-6">
                <div className="flex items-center p-4 bg-[var(--success-bg)] rounded-lg border border-[var(--success-border)]">
                  <div className="bg-green-100 p-2 rounded-full mr-4">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[var(--success-text)] font-semibold">Connected to YouTube</p>
                    <p className="text-green-600 text-sm">
                      {authStatus.channelTitle ? `Account: ${authStatus.channelTitle}` : 'YouTube account connected'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleContinueToApp}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Continue to Channel Picker
                  </button>

                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    {disconnecting ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Disconnect
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // Not Connected State
              <div className="space-y-6">
                <div className="flex items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="bg-yellow-100 p-2 rounded-full mr-4">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-yellow-800 font-semibold">Not Connected to YouTube</p>
                    <p className="text-yellow-600 text-sm">
                      Connect your YouTube account to start curating your subscriptions
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleConnectGoogle}
                  disabled={oauthLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  {oauthLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      Connecting to Google...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Connect with Google OAuth
                    </>
                  )}
                </button>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    OAuth integration provides read-only access to your YouTube subscriptions
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* App Information */}
          <div className="bg-[var(--card-bg)] rounded-xl shadow-[var(--card-shadow)] p-8">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-3 rounded-full mr-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">About Subscription Curator</h2>
                <p className="text-[var(--text-secondary)] mt-1">Organize and curate your YouTube subscriptions</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="text-center p-4 bg-[var(--accent-bg)] rounded-lg">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Channel Selection</h3>
                <p className="text-sm text-[var(--text-secondary)]">Choose which channels to include in your digest</p>
              </div>

              <div className="text-center p-4 bg-[var(--accent-bg)] rounded-lg">
                <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Smart Categories</h3>
                <p className="text-sm text-[var(--text-secondary)]">Organize channels into custom categories</p>
              </div>

              <div className="text-center p-4 bg-[var(--accent-bg)] rounded-lg">
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Video Digest</h3>
                <p className="text-sm text-[var(--text-secondary)]">Get curated videos from your selected channels</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-[var(--border-color)]">
            <Link
              to="/"
              className="flex items-center text-blue-600 hover:text-blue-800 font-semibold text-lg transition-colors"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>

            {authStatus?.connected && (
              <Link
                to="/channels"
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-3"
              >
                Go to Channel Picker
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
