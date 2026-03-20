import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAppContext } from '../context/AppContext.jsx'
import { configureLeafletIcons } from '../lib/leafletIcons.js'
import ListingMarkerPopup from './ListingMarkerPopup.jsx'

const DEFAULT_CENTER = [20.5937, 78.9629]

function getCenterFromGeolocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('geolocation not supported'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 20000 }
    )
  })
}

export default function MapView() {
  const { activeListings, initialLoading } = useAppContext()
  const [center, setCenter] = useState(DEFAULT_CENTER)

  useEffect(() => {
    configureLeafletIcons()
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const c = await getCenterFromGeolocation()
        if (mounted) setCenter(c)
      } catch {
        // ignore
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const markers = useMemo(() => activeListings, [activeListings])

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="p-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">active listings</h2>
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {initialLoading ? 'loading...' : `${markers.length} marker${markers.length === 1 ? '' : 's'}`}
        </div>
      </div>

      <div className="h-72 w-full sm:h-80">
        <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((l) => (
            <Marker key={l.id} position={[l.lat, l.lng]}>
              <Popup>
                <ListingMarkerPopup listing={l} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

