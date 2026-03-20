import React, { useState } from 'react'
import { useAppContext } from '../context/AppContext.jsx'

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('geolocation not supported'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 20000 }
    )
  })
}

export default function ListingForm() {
  const { addListing } = useAppContext()

  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('')
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setMessage(null)

    if (!title.trim()) return setMessage('title required')
    if (!quantity.trim()) return setMessage('quantity required')

    setSubmitting(true)
    setLocating(true)
    try {
      const { lat, lng } = await getCurrentPosition()
      setLocating(false)
      await addListing({ title: title.trim(), quantity: quantity.trim(), lat, lng })
      setTitle('')
      setQuantity('')
      setMessage('listing added')
    } catch (err) {
      setMessage(err?.message || 'failed to add listing')
    } finally {
      setSubmitting(false)
      setLocating(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">add listing</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-700 dark:text-slate-300">title</span>
          <input
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., leftover rice"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-700 dark:text-slate-300">quantity</span>
          <input
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g., 20 kg"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? (locating ? 'getting location...' : 'adding...') : 'create listing'}
        </button>

        {message ? <div className="text-sm text-slate-700 dark:text-slate-200">{message}</div> : null}
      </form>
    </div>
  )
}

