import React, { useState } from 'react'

export default function StarRating({ rating = 0, onRate, readonly = false, size = 'md' }) {
  const [hovered, setHovered] = useState(0)
  const sz = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  // On mobile, show a numeric input instead of 10 stars
  if (!readonly) {
    return (
      <>
        {/* Desktop: star row */}
        <div className="hidden sm:flex gap-0.5">
          {[1,2,3,4,5,6,7,8,9,10].map(star => {
            const filled = star <= (hovered || rating)
            return (
              <button
                key={star}
                onClick={() => onRate?.(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                className="cursor-pointer transition-transform hover:scale-125"
              >
                <svg className={sz} viewBox="0 0 20 20" fill={filled ? '#f59e0b' : 'none'} stroke={filled ? '#f59e0b' : '#3f3f46'} strokeWidth="1.5">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            )
          })}
        </div>

        {/* Mobile: number picker */}
        <div className="flex sm:hidden items-center gap-1.5">
          <select
            value={rating || ''}
            onChange={e => onRate?.(parseInt(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="" disabled>—</option>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          {rating > 0 && (
            <span className="text-amber-400 text-sm font-medium">{rating}</span>
          )}
        </div>
      </>
    )
  }

  // Readonly: stars on desktop, number on mobile
  return (
    <>
      <div className="hidden sm:flex gap-0.5">
        {[1,2,3,4,5,6,7,8,9,10].map(star => {
          const filled = star <= rating
          return (
            <button key={star} disabled className="cursor-default">
              <svg className={sz} viewBox="0 0 20 20" fill={filled ? '#f59e0b' : 'none'} stroke={filled ? '#f59e0b' : '#3f3f46'} strokeWidth="1.5">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          )
        })}
      </div>
      <div className="flex sm:hidden items-center">
        <span className="text-amber-400 text-sm font-bold">{rating}</span>
        <span className="text-zinc-600 text-xs ml-0.5">/10</span>
      </div>
    </>
  )
}
