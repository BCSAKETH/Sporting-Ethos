import React, { useEffect, useState } from 'react'

export default function AppBanner({ appScheme = 'sportingethos://' }) {
  const [showBanner, setShowBanner] = useState(false)
  const [attempted, setAttempted] = useState(false)

  useEffect(() => {
    // Detect mobile device user agent or small screen with touch
    const ua = navigator.userAgent || ''
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    const isSmallScreen = window.innerWidth <= 768 && 'ontouchstart' in window

    if (isMobileUA || isSmallScreen) {
      const dismissed = sessionStorage.getItem('ethos_app_banner_dismissed')
      if (!dismissed) {
        setShowBanner(true)
      }
    }
  }, [])

  const handleOpenApp = () => {
    setAttempted(true)
    window.location.href = appScheme
    setTimeout(() => {
      setAttempted(false)
    }, 2000)
  }

  const handleDismiss = () => {
    sessionStorage.setItem('ethos_app_banner_dismissed', 'true')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="bg-purple-950 text-purple-100 px-4 py-3 shadow-md flex items-center justify-between gap-3 sticky top-0 z-50 animate-pop border-b border-purple-900">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={handleDismiss}
          className="text-purple-300 hover:text-white p-1 rounded-md text-lg leading-none"
          title="Dismiss"
        >
          ✕
        </button>
        <div className="h-10 w-10 rounded-xl bg-purple-700 flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0 text-xl">
          SE
        </div>
        <div className="min-w-0 text-left">
          <div className="text-sm font-semibold truncate text-white">Sporting Ethos App</div>
          <div className="text-xs text-purple-200 truncate">Open in our mobile app for best experience</div>
        </div>
      </div>
      <button
        onClick={handleOpenApp}
        className="flex-shrink-0 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-medium text-xs px-3.5 py-2 rounded-xl transition shadow-sm"
      >
        {attempted ? 'Opening...' : 'Open App'}
      </button>
    </div>
  )
}
