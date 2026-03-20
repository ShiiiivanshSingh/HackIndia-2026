import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAppContext } from '../context/AppContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import GlassCard from '../ui/GlassCard.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { configureLeafletIcons } from '../lib/leafletIcons.js'

const DEFAULT_CENTER = [20.5937, 78.9629]

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function urgencyBadge(expiryIso) {
  if (!expiryIso) return { level: 'warning', label: 'unknown', minutesLeft: null }
  const expiry = new Date(expiryIso)
  const diffMin = (expiry.getTime() - Date.now()) / 60000
  const minutesLeft = Math.ceil(diffMin)
  if (diffMin <= 60) return { level: 'danger', label: 'urgent', minutesLeft }
  if (diffMin <= 180) return { level: 'warning', label: 'soon', minutesLeft }
  return { level: 'success', label: 'normal', minutesLeft }
}

function formatMinutes(mins) {
  if (mins == null) return '—'
  if (mins < 0) return 'expired'
  if (mins < 60) return `${mins}m`
  const hr = Math.floor(mins / 60)
  const rem = mins % 60
  if (rem === 0) return `${hr}h`
  return `${hr}h ${rem}m`
}

export default function CollectorDashboard({ onTrack }) {
  const { activeListings, claimedListings, claimListing, listings, user } = useAppContext()

  const [collector, setCollector] = useState(null)
  const [query, setQuery] = useState('')

  const [radiusKm, setRadiusKm] = useState(10)
  const [foodType, setFoodType] = useState('any')
  const [urgency, setUrgency] = useState('any')
  const [veganOnly, setVeganOnly] = useState(false)
  const [noNuts, setNoNuts] = useState(false)
  const [pickupWindowMins, setPickupWindowMins] = useState(180)

  const [busyId, setBusyId] = useState(null)
  const [claimError, setClaimError] = useState(null)

  const [donorTrustById, setDonorTrustById] = useState({})

  const myClaimed = useMemo(() => {
    if (!user) return []
    return claimedListings.filter((l) => l.collector_id === user.id && l.status === 'claimed')
  }, [claimedListings, user])

  const firstClaimed = myClaimed[0] || null

  const center = useMemo(() => {
    if (collector) return [collector.lat, collector.lng]
    return DEFAULT_CENTER
  }, [collector])

  useEffect(() => {
    configureLeafletIcons()
  }, [])

  useEffect(() => {
    if (!user) return

    let mounted = true

    async function loadLocation() {
      const { data, error } = await supabase
        .from('collector_locations')
        .select('lat,lng,radius_km')
        .eq('user_id', user.id)
        .single()

      if (!mounted) return

      if (!error && data) {
        setCollector({ lat: data.lat, lng: data.lng })
        setRadiusKm(Number(data.radius_km ?? 10))
        return
      }

      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setCollector({ lat, lng })
          supabase
            .from('collector_locations')
            .upsert({ user_id: user.id, lat, lng, radius_km: radiusKm })
            .catch(() => {})
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 20000 }
      )
    }

    loadLocation()
    return () => {
      mounted = false
    }
  }, [user?.id])

  useEffect(() => {
    if (!user || !collector) return
    supabase
      .from('collector_locations')
      .upsert({ user_id: user.id, lat: collector.lat, lng: collector.lng, radius_km: radiusKm })
      .catch(() => {})
  }, [user?.id, radiusKm, collector?.lat, collector?.lng])

  const donorIdsKey = useMemo(() => {
    const ids = Array.from(new Set(activeListings.map((l) => l.donor_id).filter(Boolean)))
    ids.sort()
    return ids.join(',')
  }, [activeListings])

  useEffect(() => {
    if (!user) return
    if (!donorIdsKey) {
      setDonorTrustById({})
      return
    }

    const ids = donorIdsKey.split(',').filter(Boolean)
    supabase
      .from('profiles')
      .select('user_id,trust_score')
      .in('user_id', ids)
      .then(({ data }) => {
        const next = {}
        ;(data || []).forEach((p) => {
          next[p.user_id] = Number(p.trust_score ?? 0)
        })
        setDonorTrustById(next)
      })
      .catch(() => {})
  }, [user?.id, donorIdsKey])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const now = Date.now()
    return activeListings
      .map((l) => {
        const distanceKm = collector ? haversineKm(collector.lat, collector.lng, l.lat, l.lng) : null
        return { ...l, distanceKm }
      })
      .filter((l) => {
        if (q) {
          const hay = `${l.title || ''} ${l.quantity || ''}`.toLowerCase()
          if (!hay.includes(q)) return false
        }

        if (l.distanceKm != null && l.distanceKm > radiusKm) return false

        if (foodType !== 'any') {
          if (l.food_type !== foodType) return false
        }

        if (urgency !== 'any') {
          const u = urgencyBadge(l.expiry_time)
          if (u.label !== urgency) return false
        }

        if (veganOnly) {
          if (l.dietary?.vegan !== true) return false
        }

        if (noNuts) {
          if (l.dietary?.contains_nuts === true) return false
        }

        if (pickupWindowMins != null && pickupWindowMins > 0 && l.pickup_start_time) {
          const startMs = new Date(l.pickup_start_time).getTime()
          if (startMs > now + pickupWindowMins * 60000) return false
        }

        return true
      })
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0
        if (a.distanceKm == null) return 1
        if (b.distanceKm == null) return -1
        return a.distanceKm - b.distanceKm
      })
  }, [activeListings, collector, query, radiusKm, foodType, urgency, veganOnly, noNuts, pickupWindowMins])

  async function onClaim(id) {
    setClaimError(null)
    setBusyId(id)
    try {
      await claimListing(id)
      if (onTrack) onTrack()
    } catch (err) {
      setClaimError(err?.message || 'claim failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6">
        {!user ? (
          <div className="mb-4">
            <div className="text-lg font-semibold">login required</div>
            <div className="text-sm text-white/70 mt-1">sign in to claim donations</div>
          </div>
        ) : null}

        {user ? (
          <>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-sm text-white/60">collector dashboard</div>
                <div className="text-2xl font-bold">nearby donations</div>
              </div>
              {firstClaimed ? (
                <Button onClick={onTrack} className="bg-green-500 hover:bg-green-600">
                  track pickup
                </Button>
              ) : null}
            </div>

            <div className="rounded-2xl bg-gray-900/30 border border-white/10 p-4 mb-4">
              <div className="grid gap-3 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-4 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs text-white/60">distance</span>
                    <select
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(Number(e.target.value))}
                      className="p-2 rounded-lg border border-gray-700 bg-gray-900 text-sm"
                    >
                      <option value={5}>within 5 km</option>
                      <option value={10}>within 10 km</option>
                      <option value={20}>within 20 km</option>
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs text-white/60">urgency</span>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value)}
                      className="p-2 rounded-lg border border-gray-700 bg-gray-900 text-sm"
                    >
                      <option value="any">any</option>
                      <option value="urgent">urgent</option>
                      <option value="soon">soon</option>
                      <option value="normal">normal</option>
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs text-white/60">food type</span>
                    <select
                      value={foodType}
                      onChange={(e) => setFoodType(e.target.value)}
                      className="p-2 rounded-lg border border-gray-700 bg-gray-900 text-sm"
                    >
                      <option value="any">any</option>
                      <option value="veg">veg</option>
                      <option value="non-veg">non-veg</option>
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs text-white/60">pickup window</span>
                    <select
                      value={pickupWindowMins}
                      onChange={(e) => setPickupWindowMins(Number(e.target.value))}
                      className="p-2 rounded-lg border border-gray-700 bg-gray-900 text-sm"
                    >
                      <option value={120}>next 2h</option>
                      <option value={180}>next 3h</option>
                      <option value={240}>next 4h</option>
                      <option value={0}>any time</option>
                    </select>
                  </label>
                </div>

                <div className="lg:col-span-8 grid gap-3 lg:grid-cols-2 lg:items-end">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/40 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={veganOnly}
                        onChange={(e) => setVeganOnly(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-white/80">vegan only</span>
                    </label>

                    <label className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/40 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={noNuts}
                        onChange={(e) => setNoNuts(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-white/80">no nuts</span>
                    </label>
                  </div>

                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="search title or quantity..."
                    className="w-full p-3 rounded-lg border border-gray-700 bg-gray-900 text-sm outline-none focus:border-green-500"
                  />
                </div>
              </div>
            </div>

            {claimError ? (
              <div className="mb-3 rounded-xl border border-red-600 bg-red-600/10 p-3 text-sm text-red-200">
                {claimError}
              </div>
            ) : null}

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 lg:col-span-7">
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-gray-900/20">
                  <MapContainer
                    center={center}
                    zoom={12}
                    scrollWheelZoom={true}
                    style={{ height: 460, width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {filtered.map((l) => {
                      const u = urgencyBadge(l.expiry_time)
                      return (
                        <Marker key={l.id} position={[l.lat, l.lng]}>
                          <Popup>
                            <div className="min-w-[190px]">
                              <div className="font-semibold">{l.title}</div>
                              <div className="text-sm text-white/70 mt-1">{l.quantity}</div>
                              <div className="mt-2 flex items-center gap-2">
                                <Badge variant={u.level}>{u.label}</Badge>
                                <div className="text-xs text-white/60">{formatMinutes(u.minutesLeft)}</div>
                              </div>
                              <div className="mt-3">
                                <Button
                                  className="w-full"
                                  onClick={() => onClaim(l.id)}
                                  disabled={busyId === l.id}
                                >
                                  {busyId === l.id ? 'claiming...' : 'claim'}
                                </Button>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      )
                    })}
                  </MapContainer>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-5">
                <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-3">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-sm text-white/70">donations</div>
                    <div className="text-xs text-white/50">{filtered.length} found</div>
                  </div>

                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                    {firstClaimed ? (
                      (() => {
                        const claimedUntil = firstClaimed.claimed_until ? new Date(firstClaimed.claimed_until) : null
                        const minutesLeft = claimedUntil ? Math.ceil((claimedUntil.getTime() - Date.now()) / 60000) : null
                        return (
                          <GlassCard className="bg-gray-900/25">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold">reserved: {firstClaimed.title}</div>
                                <div className="text-sm text-white/60 mt-1">{firstClaimed.quantity}</div>
                                <div className="mt-2 text-xs text-white/60">
                                  claim ends in: {formatMinutes(minutesLeft)}
                                </div>
                              </div>
                              <Badge variant="success">reserved</Badge>
                            </div>
                            <div className="mt-3">
                              <Button className="w-full bg-green-500 hover:bg-green-600" onClick={onTrack}>
                                track pickup
                              </Button>
                            </div>
                          </GlassCard>
                        )
                      })()
                    ) : null}

                    {filtered.map((l) => {
                      const u = urgencyBadge(l.expiry_time)
                      const donorTrust = l.donor_id ? donorTrustById[l.donor_id] : null
                      return (
                        <GlassCard key={l.id} className="bg-gray-900/25">
                          <div className="flex gap-3">
                            <div className="h-16 w-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                              <div className="text-green-400 font-bold">{(l.title || 'f')[0].toUpperCase()}</div>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">{l.title}</div>
                                  <div className="text-sm text-white/70 mt-1">{l.quantity}</div>
                                </div>
                                <Badge variant={u.level}>{u.label}</Badge>
                              </div>

                              <div className="mt-2 text-xs text-white/60">
                                distance: {l.distanceKm == null ? '—' : `${l.distanceKm.toFixed(1)} km`}
                              </div>
                              <div className="mt-1 text-xs text-white/60">time left: {formatMinutes(u.minutesLeft)}</div>
                              <div className="mt-1 text-xs text-white/60">
                                donor trust: {donorTrust == null ? '—' : donorTrust}
                              </div>

                              <div className="mt-3">
                                <Button
                                  className="w-full"
                                  onClick={() => onClaim(l.id)}
                                  disabled={busyId === l.id}
                                >
                                  {busyId === l.id ? 'claiming...' : 'claim'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </GlassCard>
                      )
                    })}

                    {filtered.length === 0 ? (
                      <div className="text-sm text-white/60">no donations match your filters</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

