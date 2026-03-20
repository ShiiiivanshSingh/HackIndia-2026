import React, { useState } from 'react'
import { useAppContext } from '../context/AppContext.jsx'
import Button from '../ui/Button.jsx'

export default function LoginModal({ open, onClose }) {
  const { user, signInWithOtp } = useAppContext()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  if (!open) return null

  async function onSubmit(e) {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    try {
      await signInWithOtp(email.trim())
      setMsg('check your inbox for the sign-in link')
    } catch (err) {
      setMsg(err?.message || 'sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900/95 p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-lg font-bold">sign in</div>
            <div className="text-sm text-white/60">magic link via email</div>
          </div>
          <button
            type="button"
            onClick={() => onClose && onClose()}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm hover:bg-white/10 transition"
          >
            close
          </button>
        </div>

        {user ? <div className="text-sm text-green-300 mb-3">you are signed in</div> : null}

        <form onSubmit={onSubmit} className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm text-white/70">email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="p-3 rounded-lg border border-gray-700 bg-gray-900 text-sm outline-none focus:border-green-500"
            />
          </label>

          <Button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full"
          >
            {loading ? 'sending...' : 'send sign-in link'}
          </Button>

          {msg ? <div className="text-sm text-white/70">{msg}</div> : null}
        </form>
      </div>
    </div>
  )
}

