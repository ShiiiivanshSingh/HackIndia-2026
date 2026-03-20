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
  const { user, signUpWithPassword, signInWithPassword } = useAppContext()
  const [authMode, setAuthMode] = useState('signup') // signup: email+role+password+retype, login: email+password
  const [mode, setMode] = useState(initialMode) // used for signup role + post-login screen routing
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [retypePassword, setRetypePassword] = useState('')
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
      setLoading(true)
      if (authMode === 'signup') {
        if (!password) return
        if (!retypePassword) return
        if (password !== retypePassword) {
          setMsg('passwords do not match')
          return
        }
        localStorage.setItem('geoserve_ui_mode', mode)
        const result = await signUpWithPassword({ email: email.trim(), role: mode, password })
        setMsg(result?.session ? 'signed in' : 'account created (check your email to confirm)')
      } else {
        if (!password) return
        await signInWithPassword({ email: email.trim(), password })
        setMsg('signed in')
      }
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
              <span className="text-sm text-white/80">password authentication</span>
            </div>

            <Card className="bg-gray-900/40">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  type="button"
                  variant={authMode === 'signup' ? 'secondary' : 'ghost'}
                  className="flex-1"
                  onClick={() => setAuthMode('signup')}
                >
                  create account
                </Button>
                <Button
                  type="button"
                  variant={authMode === 'login' ? 'secondary' : 'ghost'}
                  className="flex-1"
                  onClick={() => setAuthMode('login')}
                >
                  log in
                </Button>
              </div>

              {authMode === 'signup' ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="text-xl font-bold">Sign in</div>
                  <div className="mt-1 text-sm text-white/60">enter your email and password</div>
                </>
              )}

              <div className="mt-6">
                <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 sm:col-span-2">
                    <span className="text-sm text-white/70">email</span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="p-3 rounded-lg border border-gray-700 bg-gray-900 text-sm outline-none focus:border-green-500"
                      placeholder="you@example.com"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm text-white/70">password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="p-3 rounded-lg border border-gray-700 bg-gray-900 text-sm outline-none focus:border-green-500"
                      placeholder="••••••••"
                    />
                  </label>

                  {authMode === 'signup' ? (
                    <label className="grid gap-2">
                      <span className="text-sm text-white/70">retype password</span>
                      <input
                        type="password"
                        value={retypePassword}
                        onChange={(e) => setRetypePassword(e.target.value)}
                        className="p-3 rounded-lg border border-gray-700 bg-gray-900 text-sm outline-none focus:border-green-500"
                        placeholder="••••••••"
                      />
                    </label>
                  ) : null}

                  <div className="sm:col-span-2 flex items-center gap-3">
                    <Button type="submit" disabled={loading || !email.trim() || !password} className="flex-1">
                      {loading ? 'working...' : authMode === 'signup' ? 'create account' : 'sign in'}
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

