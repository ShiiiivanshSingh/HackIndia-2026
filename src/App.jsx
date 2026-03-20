import React, { useEffect } from 'react'
import { AppProvider, useAppContext } from './context/AppContext.jsx'
import LandingPage from './pages/LandingPage.jsx'
import DonateWizard from './pages/DonateWizard.jsx'
import CollectorDashboard from './pages/CollectorDashboard.jsx'
import PickupTracking from './pages/PickupTracking.jsx'
import SignInPage from './pages/SignInPage.jsx'
import NotificationsWidget from './components/NotificationsWidget.jsx'

function ToastLayer() {
  const { error, initialLoading, supabaseClientConfigured } = useAppContext()
  if (!error || supabaseClientConfigured) return null
  const msg = String(error || '')
  if (msg.toLowerCase().includes('supabase not configured')) return null
  return (
    <div className="mx-auto w-full max-w-5xl rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
      {initialLoading ? 'loading...' : error}
    </div>
  )
}

function AppInner() {
  const [route, setRoute] = React.useState('landing')
  const { user } = useAppContext()

  useEffect(() => {
    if (!user) return
    const uiMode = localStorage.getItem('geoserve_ui_mode') || 'collector'
    if (route === 'landing' || route === 'signin') {
      if (uiMode === 'donor') setRoute('donor')
      else if (uiMode === 'driver') setRoute('driver')
      else setRoute('collector')
    }
  }, [user, route])

  useEffect(() => {
    if (user) return
    if (route === 'landing' || route === 'signin') return
    setRoute('landing')
  }, [user, route])

  function goToMode(mode) {
    localStorage.setItem('geoserve_ui_mode', mode)
    if (!user) {
      setRoute('signin')
      return
    }
    if (mode === 'donor') setRoute('donor')
    else if (mode === 'driver') setRoute('driver')
    else setRoute('collector')
  }

  return (
    <div>
      <ToastLayer />
      <NotificationsWidget />
      {route === 'landing' ? (
        <LandingPage onDonate={() => goToMode('donor')} onCollect={() => goToMode('collector')} onDriver={() => goToMode('driver')} />
      ) : null}
      {route === 'signin' ? (
        <SignInPage
          initialMode={localStorage.getItem('geoserve_ui_mode') || 'collector'}
          onBack={() => setRoute('landing')}
        />
      ) : null}
      {route === 'donor' ? (
        <DonateWizard onDone={() => setRoute('landing')} />
      ) : null}
      {route === 'collector' ? <CollectorDashboard onTrack={() => setRoute('driver')} /> : null}
      {route === 'driver' ? <PickupTracking onBack={() => setRoute('collector')} /> : null}
    </div>
  )
}

export default function App() {
  useEffect(() => {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) document.documentElement.classList.add('dark')
  }, [])

  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}

