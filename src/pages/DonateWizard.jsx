import React, { useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import Stepper from '../ui/Stepper.jsx'
import GlassCard from '../ui/GlassCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { configureLeafletIcons } from '../lib/leafletIcons.js'

const DEFAULT_CENTER = [20.5937, 78.9629]

function urgencyFromExpiry(expiryIso) {
  if (!expiryIso) return { level: 'success', label: 'planned', color: 'bg-green-700' }
  const expiry = new Date(expiryIso)
  const diffMs = expiry.getTime() - Date.now()
  const diffMin = diffMs / 60000
  if (diffMin <= 60) return { level: 'danger', label: 'urgent', color: 'bg-red-700' }
  if (diffMin <= 180) return { level: 'warning', label: 'soon', color: 'bg-orange-600' }
  return { level: 'success', label: 'normal', color: 'bg-green-700' }
}

function formatEstimatedPickup(expiryIso) {
  const u = urgencyFromExpiry(expiryIso)
  if (u.level === 'danger') return '20-40 minutes'
  if (u.level === 'warning') return '45-75 minutes'
  return '1-2 hours'
}

function reverseGeocode(lat, lng) {
  return fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
    .then((r) => r.json())
    .then((data) => {
      const a = data?.address
      if (!a) return ''
      return [a.house_number, a.road, a.neighbourhood, a.city, a.state, a.postcode]
        .filter(Boolean)
        .join(', ')
    })
    .catch(() => '')
}

export default function DonateWizard({ onDone }) {
  const steps = useMemo(() => ['food details', 'pickup location', 'time window', 'upload images'], [])
  const [activeStep, setActiveStep] = useState(0)

  const { addListing, user } = useAppContext()

  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('')
  const [foodType, setFoodType] = useState('veg')
  const [vegan, setVegan] = useState(false)
  const [containsNuts, setContainsNuts] = useState(false)

  const [pickerLat, setPickerLat] = useState(null)
  const [pickerLng, setPickerLng] = useState(null)
  const [address, setAddress] = useState('')
  const [geoCenter, setGeoCenter] = useState(DEFAULT_CENTER)
  const [locError, setLocError] = useState(null)

  const [startLocal, setStartLocal] = useState(() => {
    const d = new Date(Date.now() + 30 * 60000)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })

  const startIso = useMemo(() => {
    if (!startLocal) return null
    const d = new Date(startLocal)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }, [startLocal])

  const [expiryLocal, setExpiryLocal] = useState(() => {
    const d = new Date(Date.now() + 90 * 60000)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const expiryIso = useMemo(() => {
    if (!expiryLocal) return null
    const d = new Date(expiryLocal)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }, [expiryLocal])

  const [images, setImages] = useState([])
  const [posting, setPosting] = useState(false)
  const [msg, setMsg] = useState(null)

  const urgency = useMemo(() => urgencyFromExpiry(expiryIso), [expiryIso])
  const estimatedPickup = useMemo(() => formatEstimatedPickup(expiryIso), [expiryIso])

  const canNext = useMemo(() => {
    if (activeStep === 0) return title.trim() && quantity.trim() && foodType
    if (activeStep === 1) return pickerLat != null && pickerLng != null
    if (activeStep === 2) return Boolean(expiryIso && startIso)
    return true
  }, [activeStep, expiryIso, startIso, foodType, pickerLat, pickerLng, quantity, title])

  function onNext() {
    if (!canNext) return
    setActiveStep((s) => Math.min(3, s + 1))
  }

  function onBack() {
    setActiveStep((s) => Math.max(0, s - 1))
  }

  function startGeolocate() {
    if (!navigator.geolocation) {
      setLocError('geolocation not supported')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setGeoCenter([lat, lng])
        setPickerLat(lat)
        setPickerLng(lng)
        setLocError(null)
        reverseGeocode(lat, lng).then((a) => setAddress(a || `${lat.toFixed(5)}, ${lng.toFixed(5)}`))
      },
      () => setLocError('could not fetch location'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 20000 }
    )
  }

  React.useEffect(() => {
    configureLeafletIcons()
  }, [])

  async function onPost(e) {
    e.preventDefault()
    if (pickerLat == null || pickerLng == null) return
    setMsg(null)
    setPosting(true)
    try {
      await addListing({
        title: title.trim(),
        quantity: quantity.trim(),
        lat: pickerLat,
        lng: pickerLng,
        expiryTime: expiryIso,
        pickupStartTime: startIso,
        foodType,
        dietary: {
          vegan,
          contains_nuts: containsNuts
        },
        address
      })
      setMsg('donation posted')
      setPosting(false)
      if (onDone) onDone()
    } catch (err) {
      setMsg(err?.message || 'failed to post donation')
      setPosting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {!user ? (
          <Card>
            <div className="text-lg font-semibold mb-2">login required</div>
            <div className="text-sm text-white/70">sign in to post a donation</div>
            <div className="mt-4">
              <Button type="button" onClick={() => onDone && onDone()}>
                back
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <div className="text-sm text-white/60">post donation</div>
                <div className="text-2xl font-bold">multi-step listing</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => onDone && onDone()}>
                  back
                </Button>
              </div>
            </div>

            <Stepper steps={steps} activeStep={activeStep} />

            <form onSubmit={onPost} className="mt-6 grid gap-4">
              {activeStep === 0 ? (
                <Card>
                  <div className="text-lg font-semibold mb-2">1. food details</div>
                  <div className="grid gap-3">
                    <label className="grid gap-2">
                      <span className="text-sm text-white/70">title</span>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="p-3 rounded-lg border border-gray-700 bg-gray-900 focus:outline-none focus:border-green-500"
                        placeholder="e.g., leftover rice"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm text-white/70">quantity</span>
                      <input
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="p-3 rounded-lg border border-gray-700 bg-gray-900 focus:outline-none focus:border-green-500"
                        placeholder="e.g., 20 kg"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm text-white/70">type</span>
                      <select
                        value={foodType}
                        onChange={(e) => setFoodType(e.target.value)}
                        className="p-3 rounded-lg border border-gray-700 bg-gray-900 focus:outline-none focus:border-green-500"
                      >
                        <option value="veg">veg</option>
                        <option value="non-veg">non-veg</option>
                        <option value="any">any</option>
                      </select>
                    </label>

                    <div className="mt-1 grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/30 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={vegan}
                          onChange={(e) => setVegan(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-green-500"
                        />
                        <span className="text-sm text-white/80">vegan</span>
                      </label>

                      <label className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/30 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={containsNuts}
                          onChange={(e) => setContainsNuts(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-green-500"
                        />
                        <span className="text-sm text-white/80">contains nuts</span>
                      </label>
                    </div>
                  </div>
                </Card>
              ) : null}

              {activeStep === 1 ? (
                <Card>
                  <div className="text-lg font-semibold mb-2">2. pickup location</div>

                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-white/70">map picker + address autofill</div>
                      <Button type="button" onClick={startGeolocate}>
                        use my location
                      </Button>
                    </div>

                    {locError ? <div className="text-sm text-red-300">{locError}</div> : null}

                    <div className="h-64 rounded-xl overflow-hidden border border-white/10">
                      <MapContainer
                        center={geoCenter}
                        zoom={13}
                        scrollWheelZoom={false}
                        style={{ height: '100%', width: '100%' }}
                        whenCreated={(map) => {
                          map.on('click', (e) => {
                            const lat = e.latlng.lat
                            const lng = e.latlng.lng
                            setPickerLat(lat)
                            setPickerLng(lng)
                            reverseGeocode(lat, lng).then((a) => setAddress(a || `${lat.toFixed(5)}, ${lng.toFixed(5)}`))
                          })
                        }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {pickerLat != null && pickerLng != null ? <Marker position={[pickerLat, pickerLng]} /> : null}
                      </MapContainer>
                    </div>

                    <label className="grid gap-2">
                      <span className="text-sm text-white/70">address</span>
                      <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="p-3 rounded-lg border border-gray-700 bg-gray-900 focus:outline-none focus:border-green-500"
                        placeholder="address will try to autofill from map"
                      />
                    </label>
                  </div>
                </Card>
              ) : null}

              {activeStep === 2 ? (
                <Card>
                  <div className="text-lg font-semibold mb-2">3. time window</div>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3 justify-between flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant={urgency.level}>{urgency.label}</Badge>
                        <div className="text-sm text-white/60">estimated pickup time: {estimatedPickup}</div>
                      </div>
                      <div className="text-xs text-white/50">urgency updates donation visibility</div>
                    </div>

                    <label className="grid gap-2">
                      <span className="text-sm text-white/70">pickup start time</span>
                      <input
                        type="datetime-local"
                        value={startLocal}
                        onChange={(e) => setStartLocal(e.target.value)}
                        className="p-3 rounded-lg border border-gray-700 bg-gray-900 focus:outline-none focus:border-green-500"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm text-white/70">expiry time (pickup cutoff)</span>
                      <input
                        type="datetime-local"
                        value={expiryLocal}
                        onChange={(e) => setExpiryLocal(e.target.value)}
                        className="p-3 rounded-lg border border-gray-700 bg-gray-900 focus:outline-none focus:border-green-500"
                      />
                    </label>

                    <GlassCard className="bg-gray-900/40">
                      <div className="text-sm text-white/70">urgency indicator</div>
                      <div className="mt-1 text-lg font-semibold text-white">
                        {urgency.label === 'urgent'
                          ? 'collectors prioritize this listing'
                          : urgency.label === 'soon'
                            ? 'pickup likely soon'
                            : 'schedule pickup when available'}
                      </div>
                    </GlassCard>
                  </div>
                </Card>
              ) : null}

              {activeStep === 3 ? (
                <Card>
                  <div className="text-lg font-semibold mb-2">4. upload images</div>
                  <div className="grid gap-3">
                    <div className="text-sm text-white/60">optional: helps collectors understand your donation</div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => setImages(Array.from(e.target.files || []).slice(0, 6))}
                      className="text-sm"
                    />
                    {images.length ? (
                      <div className="grid grid-cols-3 gap-2">
                        {images.map((f, idx) => {
                          const url = URL.createObjectURL(f)
                          return (
                            <img
                              key={`${f.name}-${idx}`}
                              src={url}
                              alt="preview"
                              className="rounded-lg border border-white/10 bg-gray-900 h-24 w-full object-cover"
                            />
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-white/50">no images selected</div>
                    )}
                  </div>
                </Card>
              ) : null}

              <div className="flex items-center justify-between gap-3 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onBack}
                  disabled={activeStep === 0}
                  className={activeStep === 0 ? 'opacity-50' : ''}
                >
                  back
                </Button>
                {activeStep < 3 ? (
                  <Button type="button" onClick={onNext} disabled={!canNext} className={!canNext ? 'opacity-50' : ''}>
                    next
                  </Button>
                ) : (
                  <Button type="submit" disabled={posting || !canNext} className={posting ? 'opacity-70' : ''}>
                    {posting ? 'posting...' : 'post donation'}
                  </Button>
                )}
              </div>

              {msg ? <div className="text-sm text-white/80">{msg}</div> : null}
            </form>
          </>
        )}
      </div>
    </div>
  )
}

