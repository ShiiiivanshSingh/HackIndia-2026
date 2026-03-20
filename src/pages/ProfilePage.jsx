import React, { useMemo } from 'react'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import ProgressBar from '../ui/ProgressBar.jsx'
import GlassCard from '../ui/GlassCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'

function statusBadge(status) {
  if (status === 'completed') return <Badge variant="success">successful</Badge>
  if (status === 'claimed') return <Badge variant="warning">reserved</Badge>
  return <Badge variant="danger">active</Badge>
}

export default function ProfilePage({ onBack }) {
  const { listings, trustScore } = useAppContext()

  const stats = useMemo(() => {
    const donationsMade = listings.length
    const successfulPickups = listings.filter((l) => l.status === 'completed').length
    return { donationsMade, successfulPickups }
  }, [listings])

  const history = useMemo(() => {
    return listings
      .slice()
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
  }, [listings])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-sm text-white/60">profile</div>
            <div className="text-2xl font-bold">your trust</div>
          </div>
          <button
            onClick={() => onBack && onBack()}
            className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
          >
            back
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Card>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center text-green-400 font-bold text-xl">
                  s
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg">collector/donor</div>
                  <div className="text-sm text-white/60">based on successful pickups</div>
                </div>
                <div>
                  <Badge variant="success">trust {trustScore}</Badge>
                </div>
              </div>

              <div className="mt-4">
                <ProgressBar value={trustScore} max={20} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <GlassCard className="bg-gray-900/30">
                  <div className="text-xs text-white/60">donations made</div>
                  <div className="text-2xl font-bold text-white">{stats.donationsMade}</div>
                </GlassCard>
                <GlassCard className="bg-gray-900/30">
                  <div className="text-xs text-white/60">successful pickups</div>
                  <div className="text-2xl font-bold text-green-400">{stats.successfulPickups}</div>
                </GlassCard>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-7">
            <GlassCard className="bg-gray-900/20">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm text-white/60">history</div>
                  <div className="font-semibold text-lg">donations + pickup outcomes</div>
                </div>
                <div className="text-xs text-white/50">{history.length} items</div>
              </div>

              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="text-sm text-white/60">no history yet</div>
                ) : null}
                {history.map((l) => (
                  <Card key={l.id} className="bg-gray-900/30 hover:shadow-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{l.title}</div>
                        <div className="text-sm text-white/60">{l.quantity}</div>
                      </div>
                      {statusBadge(l.status)}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="text-xs text-white/60">
                        expires: {l.expiry_time ? new Date(l.expiry_time).toLocaleString() : '—'}
                      </div>
                      <div className="text-xs text-white/60">
                        status: <span className="text-white/90 font-semibold">{l.status}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  )
}

