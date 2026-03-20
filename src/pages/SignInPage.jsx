import React, { useState } from 'react'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import { useAppContext } from '../context/AppContext.jsx'

const MODES = [
  { key: 'donor', label: 'donor' },
  { key: 'collector', label: 'collector' },
  { key: 'driver', label: 'driver' }
]

function modeToProfileHint(mode) {
  if (mode === 'donor') return 'you can post food donations'
  if (mode === 'collector') return 'you can claim nearby donations'
  return 'you can track pickups and mark completion'
}

export default function SignInPage({ initialMode = 'collector', onBack }) {
  const { user, signInWithOtp } = useAppContext()
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  if (user) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <Card className="bg-gray-900/50">
            <div className="text-lg font-semibold">signed in</div>
            <div className="mt-1 text-sm text-white/60">taking you to your screen...</div>
          </Card>
        </div>
      </div>
    )
  }

  async function onSubmit(e) {
    e.preventDefault()
    setMsg(null)
    if (!email.trim()) return
    try {
      localStorage.setItem('geoserve_ui_mode', mode)
      setLoading(true)
      await signInWithOtp(email.trim())
      setMsg('check your inbox for the sign-in link')
    } catch (err) {
      setMsg(err?.message || 'sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <span className="text-green-400 font-bold">G</span>
            </div>
            <div>
              <div className="font-semibold text-lg">geoserve</div>
              <div className="text-sm text-white/60">sign in to continue</div>
            </div>
          </div>
          <Button variant="ghost" onClick={() => onBack && onBack()}>
            back
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 mb-5">
              <Badge variant="success">secure</Badge>
              <span className="text-sm text-white/80">magic link authentication</span>
            </div>

            <Card className="bg-gray-900/40">
              <div className="text-xl font-bold">Choose your role</div>
              <div className="mt-1 text-sm text-white/60">this only changes your screen after login</div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMode(m.key)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      mode === m.key ? 'border-green-500/60 bg-green-500/10' : 'border-white/10 bg-white/0 hover:bg-white/5'
                    }`}
                  >
                    <div className="text-sm font-semibold capitalize">{m.label}</div>
                    <div className="mt-2 text-xs text-white/60">{modeToProfileHint(m.key)}</div>
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <div className="text-sm text-white/60">Then sign in with your email</div>

                <form onSubmit={onSubmit} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 sm:col-span-2">
                    <span className="text-sm text-white/70">email</span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="p-3 rounded-lg border border-gray-700 bg-gray-900 text-sm outline-none focus:border-green-500"
                      placeholder="you@example.com"
                    />
                  </label>

                  <div className="sm:col-span-2 flex items-center gap-3">
                    <Button type="submit" disabled={loading || !email.trim()} className="flex-1">
                      {loading ? 'sending...' : 'send sign-in link'}
                    </Button>
                  </div>
                </form>

                {msg ? <div className="mt-3 text-sm text-white/70">{msg}</div> : null}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-6 shadow-lg">
              <div className="text-sm text-white/60">why this matters</div>
              <div className="mt-2 text-2xl font-bold">fast, realtime food rescue</div>
              <div className="mt-3 text-sm text-white/70">
                Listings appear instantly on the map. Claims reserve a listing for 30 minutes. Ratings and trust help keep the
                platform reliable.
              </div>
              <div className="mt-5 grid gap-3">
                <Card className="bg-gray-900/40 rounded-2xl">
                  <div className="text-sm font-semibold">one tap claim</div>
                  <div className="mt-1 text-xs text-white/60">prevents double claiming</div>
                </Card>
                <Card className="bg-gray-900/40 rounded-2xl">
                  <div className="text-sm font-semibold">expiry reminders</div>
                  <div className="mt-1 text-xs text-white/60">collect before it expires</div>
                </Card>
                <Card className="bg-gray-900/40 rounded-2xl">
                  <div className="text-sm font-semibold">trust scoring</div>
                  <div className="mt-1 text-xs text-white/60">reliability improves over time</div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

