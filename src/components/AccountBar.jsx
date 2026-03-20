import React, { useMemo } from 'react'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import { useAppContext } from '../context/AppContext.jsx'

function modeLabel(mode) {
  if (mode === 'donor') return 'donor'
  if (mode === 'driver') return 'driver'
  return 'collector'
}

export default function AccountBar() {
  const { user, profile, trustScore, signOut } = useAppContext()

  const mode = useMemo(() => {
    try {
      return localStorage.getItem('geoserve_ui_mode') || 'collector'
    } catch {
      return 'collector'
    }
  }, [])

  if (!user) return null

  const displayName = profile?.display_name || user.email || 'user'
  const initial = String(displayName || 'U')[0].toUpperCase()

  return (
    <div className="sticky top-0 z-40 backdrop-blur bg-gray-950/60 border-b border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
            <span className="text-green-300 font-bold">{initial}</span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{displayName}</div>
            <div className="text-xs text-white/60">
              signed in as <span className="text-white/80 font-semibold">{modeLabel(mode)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="success">trust {trustScore}</Badge>
          <Button variant="ghost" onClick={() => signOut && signOut()}>
            logout
          </Button>
        </div>
      </div>
    </div>
  )
}

