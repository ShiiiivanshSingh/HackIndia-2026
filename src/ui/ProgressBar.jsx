import React from 'react'

export default function ProgressBar({ value = 0, max = 20 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-white/60 mb-2">
        <span>trust</span>
        <span>{value}</span>
      </div>
      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

