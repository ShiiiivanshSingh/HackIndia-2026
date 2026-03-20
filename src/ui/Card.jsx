import React from 'react'

export default function Card({ className = '', children }) {
  return (
    <div className={`rounded-2xl bg-gray-900 p-4 shadow-lg hover:shadow-xl transition ${className}`}>
      {children}
    </div>
  )
}

