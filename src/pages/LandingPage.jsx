import React from 'react'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import { useAppContext } from '../context/AppContext.jsx'
export default function LandingPage({ onDonate, onCollect, onDriver, onSignIn }) {
  const { user, trustScore, listings, signOut } = useAppContext()
  const mealsSaved = listings.filter((l) => l.status === 'completed').length * 10
  const activeUsers = 24

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <span className="text-green-400 font-bold">G</span>
            </div>
            <div className="font-semibold text-lg tracking-tight">geoserve</div>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Button variant="ghost" onClick={() => signOut && signOut()}>
                logout
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => onSignIn && onSignIn()}>
                sign in
              </Button>
            )}
          </div>
        </nav>

        <header className="pt-12 pb-10">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 mb-5">
                <Badge variant="success">impact</Badge>
                <span className="text-sm text-white/80">real-time donations to nearby collectors</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
                Reduce Waste. Feed People.
              </h1>

              <p className="mt-5 text-white/70 text-base sm:text-lg lg:text-xl">
                donate surplus food and connect it with trusted pickups before it expires.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button onClick={() => onDonate && onDonate()}>Donate Food</Button>
                <Button variant="secondary" onClick={() => onCollect && onCollect()}>
                  Collect Food
                </Button>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => onDriver && onDriver()}
                  className="text-sm text-green-300 hover:text-green-200 transition"
                >
                  i’m a pickup driver
                </button>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-gray-900/50 rounded-2xl border border-white/5">
                  <div className="text-white/60 text-sm">Meals saved</div>
                  <div className="text-4xl font-bold text-green-400">{mealsSaved}</div>
                </Card>
                <Card className="bg-gray-900/50 rounded-2xl border border-white/5">
                  <div className="text-white/60 text-sm">Active users</div>
                  <div className="text-4xl font-bold">{activeUsers}</div>
                </Card>
                {user ? (
                  <Card className="bg-gray-900/50 rounded-2xl border border-white/5">
                    <div className="text-white/60 text-sm">Your trust</div>
                    <div className="text-4xl font-bold text-green-400">{trustScore}</div>
                  </Card>
                ) : (
                  <Card className="bg-gray-900/50 rounded-2xl border border-white/5 sm:hidden lg:block">
                    <div className="text-white/60 text-sm">Trusted pickups</div>
                    <div className="mt-2 text-sm text-white/70">sign in to see your trust score</div>
                  </Card>
                )}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-6 shadow-lg">
                <div className="text-white/80 text-sm">How it works</div>
                <div className="mt-4 grid gap-3">
                  <div className="flex gap-3 items-start">
                    <Badge variant="success">1</Badge>
                    <div>
                      <div className="font-semibold">post a donation</div>
                      <div className="text-white/60 text-sm">food type, quantity, and pickup time</div>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Badge variant="success">2</Badge>
                    <div>
                      <div className="font-semibold">claim on the map</div>
                      <div className="text-white/60 text-sm">collectors reserve listings for 30 minutes</div>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Badge variant="success">3</Badge>
                    <div>
                      <div className="font-semibold">complete pickup</div>
                      <div className="text-white/60 text-sm">ratings update trust and safety</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                  <div className="text-sm font-semibold">Built for speed</div>
                  <div className="mt-1 text-xs text-white/60">
                    minimalist flow, instant realtime updates, and clear statuses.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="pb-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-gray-900/40">
              <div className="text-sm text-white/60">Real-time map</div>
              <div className="mt-2 text-lg font-semibold">Active listings update instantly.</div>
              <div className="mt-2 text-sm text-white/60">Collectors see nearby food before it expires.</div>
            </Card>
            <Card className="bg-gray-900/40">
              <div className="text-sm text-white/60">30-minute reservation</div>
              <div className="mt-2 text-lg font-semibold">Claiming reserves safely.</div>
              <div className="mt-2 text-sm text-white/60">If it’s not completed, the listing returns.</div>
            </Card>
            <Card className="bg-gray-900/40">
              <div className="text-sm text-white/60">Trust & safety</div>
              <div className="mt-2 text-lg font-semibold">Ratings improve reliability.</div>
              <div className="mt-2 text-sm text-white/60">Low trust gets flagged for review.</div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}

