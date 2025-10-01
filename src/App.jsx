import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ChannelPicker from './pages/ChannelPicker'
import Digest from './pages/Digest'
import Settings from './pages/Settings'

function App() {
  console.log('🎬 App component rendering...')
  const location = useLocation()
  const navigate = useNavigate()
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  console.log('📍 Current location:', location.pathname)

  // Check authentication status on app startup
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('App: Checking authentication status...')
        const response = await fetch('/api/auth/status')

        if (response.ok) {
          const data = await response.json()
          setIsAuthenticated(data.connected)
          console.log('App: Auth status checked:', data.connected ? 'authenticated' : 'not authenticated')

          // If not authenticated and not already on settings page, redirect to settings
          if (!data.connected && location.pathname !== '/settings' && location.pathname !== '/') {
            console.log('App: Not authenticated, redirecting to settings...')
            navigate('/settings')
          }
        } else {
          console.error('App: Failed to check auth status')
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('App: Error checking auth status:', error)
        setIsAuthenticated(false)
      } finally {
        setAuthChecked(true)
      }
    }

    checkAuth()
  }, [location.pathname, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link
                to="/"
                className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
              >
                🎬 YT-Digest
              </Link>
            </div>

            <div className="flex items-center space-x-2">
              <Link
                to="/settings"
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                  location.pathname === '/settings'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-600 border border-gray-200 hover:border-purple-300'
                }`}
              >
                ⚙️ Settings
              </Link>
              <Link
                to="/channels"
                className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${
                  location.pathname === '/channels'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-600 border-2 border-gray-200 hover:border-purple-300'
                }`}
              >
                📺 Channel Picker
              </Link>
              <Link
                to="/digest"
                className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${
                  location.pathname === '/digest'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-600 border-2 border-gray-200 hover:border-purple-300'
                }`}
              >
                🎯 Digest
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={
            <div className="min-h-screen flex items-center justify-center px-4">
              <div className="max-w-4xl mx-auto text-center">
                <div className="mb-8">
                  <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-6">
                    YT-Digest
                  </h1>
                  <p className="text-2xl text-gray-600 mb-4">
                    Transform your YouTube experience
                  </p>
                  <p className="text-xl text-gray-500 mb-12">
                    Organize subscriptions • Create categories • Discover content
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  <Link
                    to="/channels"
                    className="group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-2 flex items-center gap-3"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Get Started
                  </Link>

                  <div className="flex items-center gap-4 text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>OAuth Ready</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>YouTube API</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span>Live Data</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          } />
          <Route path="/settings" element={<Settings />} />
          <Route path="/channels" element={<ChannelPicker />} />
          <Route path="/digest" element={<Digest />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
