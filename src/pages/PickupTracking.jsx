import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import GlassCard from '../ui/GlassCard.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { configureLeafletIcons } from '../lib/leafletIcons.js'
import { supabase } from '../lib/supabaseClient.js'

const STATUS_STEPS = ['claimed', 'on_the_way', 'picked_up', 'completed']

function statusLabel(stepKey) {
  if (stepKey === 'claimed') return 'claimed'
  if (stepKey === 'on_the_way') return 'on the way'
  if (stepKey === 'picked_up') return 'picked up'
  return 'completed'
}

export default function PickupTracking({ onBack }) {
  const { claimedListings, listings, completeListing, trustScore, user, submitReview } = useAppContext()
  const [trackedId, setTrackedId] = useState(null)
  const claimed = claimedListings[0] || listings.find((l) => l.status === 'claimed') || null

  const [livePos, setLivePos] = useState(null)
  const [stageIndex, setStageIndex] = useState(0)

  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewMsg, setReviewMsg] = useState(null)

  useEffect(() => {
    configureLeafletIcons()
  }, [])

  useEffect(() => {
    if (!claimed) return
    if (!trackedId) setTrackedId(claimed.id)
  }, [claimed, trackedId])

  const tracked = useMemo(() => {
    if (!trackedId) return null
    return listings.find((l) => l.id === trackedId) || null
  }, [listings, trackedId])

  useEffect(() => {
    if (!tracked) return
    if (tracked.status === 'completed') setStageIndex(3)
    else if (tracked.status === 'claimed') setStageIndex((i) => (i === 3 ? 0 : i))
    else setStageIndex(0)
  }, [tracked])

  useEffect(() => {
    let cancelled = false
    async function loadReview() {
      if (!tracked || !user) return
      if (tracked.status !== 'completed') return

      try {
        const { data } = await supabase
          .from('reviews')
          .select('id')
          .eq('listing_id', tracked.id)
          .eq('rater_id', user.id)
          .limit(1)

        if (cancelled) return
        setReviewSubmitted(Array.isArray(data) && data.length > 0)
      } catch {
        if (cancelled) return
        setReviewSubmitted(false)
      }
    }

    loadReview()
    return () => {
      cancelled = true
    }
  }, [tracked?.id, tracked?.status, user?.id])

  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (pos) => setLivePos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const timeline = useMemo(() => {
    return STATUS_STEPS.map((k, idx) => ({ key: k, idx, active: idx <= stageIndex }))
  }, [stageIndex])

  function onComplete() {
    if (!tracked) return
    completeListing(tracked.id).catch(() => {})
  }

  async function onSubmitReview(e) {
    e.preventDefault()
    if (!tracked) return
    setReviewBusy(true)
    setReviewMsg(null)
    try {
      await submitReview({ listingId: tracked.id, rating, comment })
      setReviewSubmitted(true)
      setReviewMsg('thanks for rating')
    } catch (err) {
      setReviewMsg(err?.message || 'rating failed')
    } finally {
      setReviewBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-sm text-white/60">pickup tracking</div>
            <div className="text-2xl font-bold">live status</div>
          </div>
          <Button variant="ghost" onClick={() => onBack && onBack()}>
            back
          </Button>
        </div>

        {!tracked || (tracked.status !== 'claimed' && tracked.status !== 'completed') ? (
          <GlassCard className="bg-gray-900/30">
            <div className="text-sm text-white/60">no active claim</div>
            <div className="mt-2 text-lg font-semibold">
              {tracked && tracked.status === 'active' ? 'claim expired' : 'claim a donation to start tracking'}
            </div>
          </GlassCard>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <GlassCard className="bg-gray-900/20">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{tracked.title}</div>
                      <div className="text-sm text-white/60">{tracked.quantity}</div>
                    </div>
                    <Badge variant="success">trust: {trustScore}</Badge>
                  </div>

                  <div className="mt-4">
                    <div className="flex gap-3 items-center">
                      {timeline.map((s) => (
                        <div key={s.key} className="flex-1">
                          <div
                            className={`h-2 rounded-full ${s.active ? 'bg-green-500' : 'bg-white/10'}`}
                            style={{ width: '100%' }}
                          />
                          <div className="mt-2 flex items-center justify-between">
                            <div className="text-xs font-semibold text-white/80 truncate">{statusLabel(s.key)}</div>
                            <div
                              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                                s.active ? 'bg-green-500 border-green-500/30' : 'bg-white/5 border-white/10 text-white/60'
                              }`}
                            >
                              {s.active ? '✓' : '•'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" variant="ghost" onClick={() => setStageIndex(1)} className={stageIndex < 1 ? '' : 'opacity-70'}>
                        on the way
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setStageIndex(2)} className={stageIndex < 2 ? '' : 'opacity-70'}>
                        picked up
                      </Button>
                      <Button type="button" onClick={() => setStageIndex(3)} className="bg-gray-800 hover:bg-gray-700">
                        sync timeline
                      </Button>
                    </div>
                  </div>
                </GlassCard>

                <div className="mt-3 grid gap-3">
                  <GlassCard className="bg-gray-900/20">
                    <div className="text-sm text-white/60">live location</div>
                    <div className="mt-2 h-72 rounded-2xl overflow-hidden border border-white/10 bg-gray-900/20">
                      <MapContainer center={livePos ? [livePos.lat, livePos.lng] : [20.5937, 78.9629]} zoom={13} scrollWheelZoom={false}>
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {livePos ? <Marker position={[livePos.lat, livePos.lng]} /> : null}
                      </MapContainer>
                    </div>
                  </GlassCard>
                </div>
              </div>

              <div className="lg:col-span-5">
                <GlassCard className="bg-gray-900/20">
                  <div className="text-sm text-white/60">chat</div>
                  <div className="mt-2 space-y-2">
                    <div className="text-sm text-white/80 bg-white/5 border border-white/10 rounded-xl p-3">
                      donor: hi, please pick up quickly.
                    </div>
                    <div className="text-sm text-white/80 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                      collector: on the way now.
                    </div>
                    <div className="text-sm text-white/80 bg-white/5 border border-white/10 rounded-xl p-3">
                      donor: thank you!
                    </div>
                  </div>

                  <div className="mt-3">
                    <input
                      placeholder="type a message..."
                      className="w-full p-3 rounded-lg border border-gray-700 bg-gray-900 text-sm outline-none focus:border-green-500"
                    />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        window.location.href = 'tel:+10000000000'
                      }}
                      className="flex-1"
                    >
                      call
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        window.location.href = 'mailto:test@example.com'
                      }}
                      className="flex-1"
                    >
                      message
                    </Button>
                  </div>

                  {tracked.status === 'completed' && !reviewSubmitted ? (
                    <div className="mt-4">
                      <div className="text-sm text-white/60">rate this pickup</div>
                      <form onSubmit={onSubmitReview} className="mt-2 grid gap-3">
                        <label className="grid gap-2">
                          <span className="text-sm text-white/70">rating (1-5)</span>
                          <select
                            value={rating}
                            onChange={(e) => setRating(Number(e.target.value))}
                            className="p-3 rounded-lg border border-gray-700 bg-gray-900 text-sm outline-none focus:border-green-500"
                          >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                            <option value={5}>5</option>
                          </select>
                        </label>

                        <label className="grid gap-2">
                          <span className="text-sm text-white/70">optional comment</span>
                          <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                            className="p-3 rounded-lg border border-gray-700 bg-gray-900 text-sm outline-none focus:border-green-500"
                          />
                        </label>

                        <Button type="submit" disabled={reviewBusy} className="bg-green-500 hover:bg-green-600">
                          {reviewBusy ? 'submitting...' : 'submit rating'}
                        </Button>

                        {reviewMsg ? <div className="text-sm text-white/70">{reviewMsg}</div> : null}
                      </form>
                    </div>
                  ) : null}
                </GlassCard>
              </div>
            </div>
          </>
        )}
      </div>

      {tracked && (tracked.status === 'claimed' || tracked.status === 'completed') ? (
        <div className="fixed bottom-0 left-0 right-0 w-full bg-gray-900/95 backdrop-blur border-t border-white/10">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 py-3 flex justify-between items-center gap-3">
            <div className="text-xs text-white/60">
              status: <span className="text-white/90 font-semibold">{tracked.status}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => {}} className="px-3">
                contact
              </Button>
              <Button type="button" onClick={onComplete} disabled={tracked.status === 'completed'} className="bg-green-500 hover:bg-green-600">
                complete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

