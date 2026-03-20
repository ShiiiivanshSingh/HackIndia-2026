import React from 'react'
import Badge from './Badge.jsx'

export default function Stepper({ steps, activeStep }) {
  return (
    <div className="flex gap-2">
      {steps.map((s, idx) => {
        const active = idx === activeStep
        const done = idx < activeStep
        const variant = done ? 'success' : active ? 'warning' : 'neutral'
        return (
          <div key={s} className="flex-1">
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${done ? 'bg-green-500' : active ? 'bg-orange-500' : 'bg-white/20'}`}
                style={{ width: done ? '100%' : active ? '100%' : '0%' }}
              />
            </div>
            <div className="mt-2 flex justify-between items-center">
              <Badge variant={variant}>{idx + 1}</Badge>
              <div className="ml-2 text-xs text-white/60 truncate">{s}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

