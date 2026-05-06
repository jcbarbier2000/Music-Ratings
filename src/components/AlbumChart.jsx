import React from 'react'

export default function AlbumChart({ albums, userRatings, adminRatings, isAdmin, adminId }) {
  // Only albums with valid numeric years and at least one rating
  const points = albums
    .filter(a => a.year && /^(19|20)\d{2}$/.test(a.year.trim()))
    .map(a => {
      const songs = a.songs || []
      const avg = (ratingMap) => {
        const vals = songs.map(s => ratingMap?.[s.id] || 0).filter(v => v > 0)
        if (!vals.length) return null
        return (vals.reduce((s, v) => s + v, 0) / vals.length)
      }
      return {
        name: a.name,
        year: parseInt(a.year),
        user: avg(userRatings),
        admin: avg(adminRatings),
      }
    })
    .filter(p => p.user !== null || p.admin !== null)
    .sort((a, b) => a.year - b.year)

  if (points.length < 1) return null

  const W = 760, H = 200
  const PAD = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const years = points.map(p => p.year)
  const minY = Math.min(...years), maxY = Math.max(...years)
  const xRange = maxY - minY || 1

  const xPos = year => PAD.left + ((year - minY) / xRange) * chartW
  const yPos = val => PAD.top + chartH - ((val / 10) * chartH)

  const linePath = (pts, key) =>
    pts.filter(p => p[key] !== null)
       .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(p.year)} ${yPos(p[key])}`)
       .join(' ')

  const gridScores = [2, 4, 6, 8, 10]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">
        Album Scores Over Time
      </h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Grid */}
        {gridScores.map(s => (
          <g key={s}>
            <line x1={PAD.left} y1={yPos(s)} x2={W - PAD.right} y2={yPos(s)}
              stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
            <text x={PAD.left - 8} y={yPos(s) + 4} fill="#52525b" fontSize="11" textAnchor="end">
              {s}
            </text>
          </g>
        ))}

        {/* Admin line */}
        {!isAdmin && points.some(p => p.admin !== null) && (
          <>
            <path d={linePath(points, 'admin')} fill="none" stroke="#7c3aed" strokeWidth="2" strokeOpacity="0.5" strokeDasharray="6 3" />
            {points.filter(p => p.admin !== null).map((p, i) => (
              <g key={i}>
                <circle cx={xPos(p.year)} cy={yPos(p.admin)} r="4" fill="#7c3aed" fillOpacity="0.7" />
                <title>{p.name} — Admin: {p.admin.toFixed(2)}</title>
              </g>
            ))}
          </>
        )}

        {/* User line */}
        {points.some(p => p.user !== null) && (
          <>
            <path d={linePath(points, 'user')} fill="none" stroke="#6366f1" strokeWidth="2.5" />
            {points.filter(p => p.user !== null).map((p, i) => (
              <g key={i}>
                <circle cx={xPos(p.year)} cy={yPos(p.user)} r="5" fill="#6366f1" stroke="#080808" strokeWidth="2" />
                {/* Score label */}
                <text x={xPos(p.year)} y={yPos(p.user) - 10} fill="#a5b4fc" fontSize="10" textAnchor="middle">
                  {p.user.toFixed(2)}
                </text>
                <title>{p.name} — You: {p.user.toFixed(2)}</title>
              </g>
            ))}
          </>
        )}

        {/* X-axis labels */}
        {points.map((p, i) => (
          <text key={i} x={xPos(p.year)} y={H - 8} fill="#52525b" fontSize="11" textAnchor="middle">
            {p.year}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex gap-6 mt-2 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-indigo-500 rounded" />
          <span className="text-xs text-zinc-500">Your ratings</span>
        </div>
        {!isAdmin && points.some(p => p.admin !== null) && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-violet-600 rounded opacity-60" style={{ borderTop: '2px dashed #7c3aed' }} />
            <span className="text-xs text-zinc-500">Admin ratings</span>
          </div>
        )}
      </div>
    </div>
  )
}
