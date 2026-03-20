import React from 'react'

export default function GlassCard({ className = '', children }) {
  return (
    <div
      className={`rounded-2xl bg-gray-900/30 border border-white/10 p-4 shadow-lg hover:shadow-xl transition ${className}`}
    >
      {children}
    </div>
  )
}

