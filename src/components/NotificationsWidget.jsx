import React, { useMemo, useState } from 'react'
import { useAppContext } from '../context/AppContext.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import GlassCard from '../ui/GlassCard.jsx'

function typeLabel(type) {
  if (type === 'expiry_approaching') return 'expiry approaching'
  if (type === 'listing_claimed') return 'listing claimed'
  if (type === 'claim_expired') return 'claim expired'
  return type || 'notification'
}

function relativeTime(ts) {
  if (!ts) return ''
  const ms = Date.now() - new Date(ts).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}

export default function NotificationsWidget() {
  const { user, notifications, unreadCount, markNotificationRead } = useAppContext()
  const [open, setOpen] = useState(false)

  const topItems = useMemo(() => notifications.slice(0, 8), [notifications])
  const hasItems = topItems.length > 0
  if (!user) return null

  return (
    <div className="fixed top-3 right-3 z-50">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl border border-white/10 bg-gray-900/50 backdrop-blur px-3 py-2 text-sm hover:bg-gray-900/70 transition"
        >
          notifications
        </button>
        {unreadCount > 0 ? <Badge variant="success">{unreadCount}</Badge> : null}
      </div>

      {open ? (
        <div className="mt-2 w-[340px] max-w-[90vw]">
          <GlassCard className="bg-gray-900/80 border-white/10">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="text-sm font-semibold">in-app</div>
              <div className="text-xs text-white/60">{notifications.length} total</div>
            </div>

            {!hasItems ? <div className="text-sm text-white/60">no notifications</div> : null}

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {topItems.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border p-3 transition ${
                    n.read_at ? 'border-white/10 bg-white/5' : 'border-green-500/30 bg-green-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{typeLabel(n.type)}</div>
                      <div className="text-xs text-white/60 mt-1">
                        {relativeTime(n.created_at)} {n.listing_id ? `• listing ${String(n.listing_id).slice(0, 6)}` : ''}
                      </div>
                    </div>
                    {!n.read_at ? (
                      <button
                        type="button"
                        onClick={() => markNotificationRead(n.id)}
                        className="rounded-lg bg-green-500 hover:bg-green-600 text-white px-2 py-1 text-xs font-semibold"
                      >
                        mark read
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                className="w-full"
              >
                close
              </Button>
            </div>
          </GlassCard>
        </div>
      ) : null}
    </div>
  )
}

