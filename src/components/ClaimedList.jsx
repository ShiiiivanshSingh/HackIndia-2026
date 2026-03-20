import React, { useState } from 'react'
import { useAppContext } from '../context/AppContext.jsx'

export default function ClaimedList() {
  const { claimedListings, completeListing } = useAppContext()
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState(null)

  async function onComplete(id) {
    setBusyId(id)
    setMsg(null)
    try {
      await completeListing(id)
      setMsg('pickup completed')
    } catch (err) {
      setMsg(err?.message || 'complete failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">claimed pickups</h2>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {claimedListings.length === 0 ? 'none yet' : `${claimedListings.length} reserved`}
          </div>
        </div>
        <div className="text-right text-xs text-slate-500 dark:text-slate-400">trust score updates on completion</div>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {claimedListings.map((l) => (
          <div key={l.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{l.title}</div>
            <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{l.quantity}</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                expires: {l.expiry_time ? new Date(l.expiry_time).toLocaleString() : '—'}
              </div>
              <button
                onClick={() => onComplete(l.id)}
                disabled={busyId === l.id}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
              >
                {busyId === l.id ? 'completing...' : 'complete'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {msg ? <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">{msg}</div> : null}
    </div>
  )
}

