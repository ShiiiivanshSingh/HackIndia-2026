import React from 'react'

export default function Button({ className = '', variant = 'primary', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400/30 active:scale-100 disabled:opacity-60 disabled:hover:scale-100'
  const styles =
    variant === 'primary'
      ? 'bg-green-500 hover:bg-green-600 text-white'
      : variant === 'secondary'
        ? 'bg-transparent text-green-300 border border-green-500/30 hover:bg-green-500/10 hover:border-green-500/60'
        : variant === 'ghost'
          ? 'bg-transparent hover:bg-white/10 text-white border border-white/10'
          : 'bg-gray-700 hover:bg-gray-600 text-white'

  return <button className={`${base} ${styles} ${className}`} {...props} />
}

