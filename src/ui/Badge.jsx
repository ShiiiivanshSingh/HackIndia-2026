import React from 'react'

export default function Badge({ className = '', variant = 'success', children }) {
  const styles =
    variant === 'success'
      ? 'bg-green-700 text-white'
      : variant === 'danger'
        ? 'bg-red-700 text-white'
        : variant === 'warning'
          ? 'bg-orange-600 text-white'
          : 'bg-gray-700 text-white'

  return <span className={`text-xs px-2 py-1 rounded-full ${styles} ${className}`}>{children}</span>
}

