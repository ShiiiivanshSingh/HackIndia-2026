import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

const AppContext = createContext(null)

function getCacheKey(userId) {
  return userId ? `geoserve_listings_cache_v1_${userId}` : 'geoserve_listings_cache_v1_anon'
}

function loadListingsCache(userId) {
  try {
    const raw = localStorage.getItem(getCacheKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function upsertListing(listings, next) {
  const idx = listings.findIndex((l) => l.id === next.id)
  if (idx === -1) return [next, ...listings]
  const copy = listings.slice()
  copy[idx] = next
  return copy
}

function upsertNotification(notifs, next) {
  const idx = notifs.findIndex((n) => n.id === next.id)
  if (idx === -1) return [next, ...notifs]
  const copy = notifs.slice()
  copy[idx] = next
  return copy
}

export function AppProvider({ children }) {
  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const [listings, setListings] = useState(() => (typeof window === 'undefined' ? [] : loadListingsCache(null)))
  const [trustScore, setTrustScore] = useState(0)

  const [notifications, setNotifications] = useState([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState(null)

  const [notificationsLoading, setNotificationsLoading] = useState(false)

  const listingsSubRef = useRef(null)
  const notificationsSubRef = useRef(null)

  const supabaseClientConfigured = Boolean(supabase)

  const activeListings = useMemo(() => listings.filter((l) => l.status === 'active'), [listings])
  const claimedListings = useMemo(() => listings.filter((l) => l.status === 'claimed'), [listings])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!authUser) return
    try {
      localStorage.setItem(getCacheKey(authUser.id), JSON.stringify(listings))
    } catch {
      // ignore
    }
  }, [authUser, listings])

  useEffect(() => {
    if (!supabase) return

    let mounted = true

    async function bootstrapAuth() {
      setError(null)
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session ?? null
      setAuthUser(session?.user ?? null)
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      setAuthUser(data?.user ?? null)
    }

    bootstrapAuth()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      try {
        listener.subscription.unsubscribe()
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    let mounted = true

    async function loadProfile() {
      if (!authUser) {
        setProfile(null)
        setTrustScore(0)
        return
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single()

      if (!mounted) return
      if (profileError) {
        setProfile(null)
        setTrustScore(0)
        return
      }

      setProfile(data || null)
      setTrustScore(Number(data?.trust_score ?? 0))
    }

    loadProfile()
    return () => {
      mounted = false
    }
  }, [authUser?.id])

  async function refreshProfile() {
    if (!supabase) return
    if (!authUser) return

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .single()

    if (profileError) return
    setProfile(data || null)
    setTrustScore(Number(data?.trust_score ?? 0))
  }

  useEffect(() => {
    if (!supabase) return
    if (!authUser) {
      setListings([])
      setInitialLoading(false)
      return
    }

    let mounted = true

    async function bootListings() {
      setError(null)
      setInitialLoading(true)
      try {
        const { data: activeData, error: fetchError } = await supabase
          .from('listings')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError
        if (!mounted) return

        const { data: ownData, error: ownError } = await supabase
          .from('listings')
          .select('*')
          .in('status', ['claimed', 'completed'])
          .or(`donor_id.eq.${authUser.id},collector_id.eq.${authUser.id}`)

        if (ownError) throw ownError

        const nextActive = Array.isArray(activeData) ? activeData : []
        const nextOwn = Array.isArray(ownData) ? ownData : []
        const byId = new Map()
        for (const l of nextActive) byId.set(l.id, l)
        for (const l of nextOwn) byId.set(l.id, l)
        setListings(Array.from(byId.values()))
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'failed to load listings')
      } finally {
        if (mounted) setInitialLoading(false)
      }
    }

    bootListings()
    return () => {
      mounted = false
    }
  }, [authUser?.id])

  useEffect(() => {
    if (!supabase) return
    if (!authUser) return

    const channel = supabase
      .channel('geoserve-listings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings' },
        (payload) => {
          const record = payload?.new || payload?.old
          if (!record || !record.id) return

          if (payload.eventType === 'DELETE') {
            setListings((prev) => prev.filter((l) => l.id !== record.id))
            return
          }

          setListings((prev) => upsertListing(prev, record))
        }
      )
      .subscribe()

    listingsSubRef.current = channel
    return () => {
      try {
        supabase.removeChannel(channel)
      } catch {
        // ignore
      }
    }
  }, [authUser?.id])

  useEffect(() => {
    if (!supabase) return
    if (!authUser) return

    setNotificationsLoading(true)
    ;(async () => {
      const { data, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (notifError) {
        setNotifications([])
        setNotificationsLoading(false)
        return
      }

      setNotifications(Array.isArray(data) ? data : [])
      setNotificationsLoading(false)
    })()

    const notifChannel = supabase
      .channel('geoserve-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${authUser.id}`
        },
        (payload) => {
          const record = payload?.new
          if (!record || !record.id) return
          setNotifications((prev) => upsertNotification(prev, record))
        }
      )
      .subscribe()

    notificationsSubRef.current = notifChannel

    return () => {
      try {
        supabase.removeChannel(notifChannel)
      } catch {
        // ignore
      }
    }
  }, [authUser?.id])

  async function addListing({ title, quantity, lat, lng, expiryTime, pickupStartTime, foodType, dietary, address }) {
    setError(null)
    if (!supabase) throw new Error('supabase not configured')
    if (!authUser) throw new Error('login required')

    const expiry = expiryTime ? new Date(expiryTime) : new Date(Date.now() + 24 * 60 * 60 * 1000)
    const now = new Date()

    const { data, error: insertError } = await supabase
      .from('listings')
      .insert({
        donor_id: authUser.id,
        title,
        quantity,
        lat,
        lng,
        status: 'active',
        expiry_time: expiry.toISOString(),
        pickup_start_time: pickupStartTime ? new Date(pickupStartTime).toISOString() : null,
        food_type: foodType || 'any',
        dietary: dietary || {},
        address: address || null,
        pickup_stage: 'active',
        claimed_at: null,
        claimed_until: null,
        completed_at: null,
        created_at: now.toISOString()
      })
      .select('*')
      .single()

    if (insertError) throw insertError
    setListings((prev) => upsertListing(prev, data))
    return data
  }

  async function claimListing(listingId) {
    setError(null)
    if (!supabase) throw new Error('supabase not configured')
    if (!authUser) throw new Error('login required')

    const claimedAt = new Date()
    const claimedUntil = new Date(claimedAt.getTime() + 30 * 60 * 1000)

    const { data, error: updateError } = await supabase
      .from('listings')
      .update({
        status: 'claimed',
        collector_id: authUser.id,
        pickup_stage: 'claimed',
        claimed_at: claimedAt.toISOString(),
        claimed_until: claimedUntil.toISOString(),
        completed_at: null
      })
      .eq('id', listingId)
      .eq('status', 'active')
      .select('*')

    if (updateError) throw updateError
    if (!data || data.length === 0) throw new Error('already claimed')

    setListings((prev) => upsertListing(prev, data[0]))
    return data[0]
  }

  async function setPickupStage(listingId, stage) {
    setError(null)
    if (!supabase) throw new Error('supabase not configured')
    if (!authUser) throw new Error('login required')

    const allowed = new Set(['claimed', 'on_the_way', 'picked_up'])
    if (!allowed.has(stage)) throw new Error('invalid stage')

    const { data, error: updateError } = await supabase
      .from('listings')
      .update({ pickup_stage: stage })
      .eq('id', listingId)
      .eq('status', 'claimed')
      .select('*')

    if (updateError) throw updateError
    if (!data || data.length === 0) throw new Error('stage update failed')

    setListings((prev) => upsertListing(prev, data[0]))
    return data[0]
  }

  async function completeListing(listingId) {
    setError(null)
    if (!supabase) throw new Error('supabase not configured')
    if (!authUser) throw new Error('login required')

    const completedAt = new Date()

    const { data, error: updateError } = await supabase
      .from('listings')
      .update({
        status: 'completed',
        pickup_stage: 'completed',
        completed_at: completedAt.toISOString()
      })
      .eq('id', listingId)
      .eq('status', 'claimed')
      .select('*')

    if (updateError) throw updateError
    if (!data || data.length === 0) throw new Error('not claimable')

    setListings((prev) => upsertListing(prev, data[0]))
    refreshProfile().catch(() => {})
    return data[0]
  }

  async function markNotificationRead(notificationId) {
    if (!supabase) return
    if (!authUser) return
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId)
  }

  async function signUpWithPassword({ email, role, password }) {
    setError(null)
    if (!supabase) throw new Error('supabase not configured')
    if (!email) throw new Error('email required')
    if (!role) throw new Error('role required')
    if (!password) throw new Error('password required')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } }
    })

    if (signUpError) throw signUpError
    return data
  }

  async function signInWithPassword({ email, password }) {
    setError(null)
    if (!supabase) throw new Error('supabase not configured')
    if (!email) throw new Error('email required')
    if (!password) throw new Error('password required')

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) throw signInError
    return data
  }

  async function signOut() {
    setError(null)
    if (!supabase) return
    await supabase.auth.signOut()
  }

  async function submitReview({ listingId, rating, comment }) {
    setError(null)
    if (!supabase) throw new Error('supabase not configured')
    if (!authUser) throw new Error('login required')
    const r = Number(rating)
    if (!Number.isFinite(r) || r < 1 || r > 5) throw new Error('rating must be 1-5')

    const { error: insertError } = await supabase.from('reviews').insert({
      listing_id: listingId,
      rater_id: authUser.id,
      rating: r,
      comment: comment || null
    })

    if (insertError) throw insertError
    refreshProfile().catch(() => {})
  }

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read_at).length, [notifications])

  const value = useMemo(
    () => ({
      user: authUser,
      listings,
      activeListings,
      claimedListings,
      trustScore,
      initialLoading,
      notifications,
      notificationsLoading,
      unreadCount,
      error,
      setError,
      supabaseClientConfigured,
      addListing,
      claimListing,
      setPickupStage,
      completeListing,
      markNotificationRead,
      profile,
      signUpWithPassword,
      signInWithPassword,
      signOut,
      submitReview
    }),
    [
      authUser,
      listings,
      activeListings,
      claimedListings,
      trustScore,
      initialLoading,
      notifications,
      notificationsLoading,
      unreadCount,
      error,
      supabaseClientConfigured
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}

