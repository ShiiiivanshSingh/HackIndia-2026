import React, { useState } from 'react'
import { useAppContext } from '../context/AppContext.jsx'

function statusText(status) {
  if (status === 'active') return 'active'
  if (status === 'claimed') return 'claimed'
  if (status === 'completed') return 'completed'
  return status || 'unknown'
}

export default function ListingMarkerPopup({ listing }) {
  const { claimListing } = useAppContext()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function onClaim() {
    setBusy(true)
    setMsg(null)
    try {
      await claimListing(listing.id)
      setMsg('claimed')
    } catch (err) {
      setMsg(err?.message || 'claim failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-w-[160px]">
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{listing.title}</div>
      <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{listing.quantity}</div>
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">status: {statusText(listing.status)}</div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        expires: {listing.expiry_time ? new Date(listing.expiry_time).toLocaleString() : '—'}
      </div>

      {listing.status === 'active' ? (
        <button
          disabled={busy}
          onClick={onClaim}
          className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
        >
          {busy ? 'claiming...' : 'claim'}
        </button>
      ) : null}

      {msg ? <div className="mt-2 text-xs text-slate-700 dark:text-slate-200">{msg}</div> : null}
    </div>
  )
}

