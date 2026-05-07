import React, { useState } from 'react'

export default function AlbumChart({ albums, userRatings, adminRatings, isAdmin, adminName }) {
  const [hovered, setHovered] = useState(null) // index of hovered point

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

  const W = 800, H = 220
  const PAD = { top: 30, right: 30, bottom: 50, left: 48 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  // Evenly space points regardless of year gaps
  const xPos = i => PAD.left + (points.length === 1 ? chartW / 2 : (chartW / (points.length - 1)) * i)
  const yPos = val => PAD.top + chartH - ((val / 10) * chartH)

  const linePath = (pts, key) => {
    const valid = pts.map((p, i) => ({ ...p, i })).filter(p => p[key] !== null)
    return valid.map((p, j) => `${j === 0 ? 'M' : 'L'} ${xPos(p.i)} ${yPos(p[key])}`).join(' ')
  }

  const gridScores = [2, 4, 6, 8, 10]
  const showAdmin = !isAdmin && points.some(p => p.admin !== null)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">
        Album Scores Over Time
      </h3>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">

          {/* Grid lines */}
          {gridScores.map(s => (
            <g key={s}>
              <line
                x1={PAD.left} y1={yPos(s)}
                x2={W - PAD.right} y2={yPos(s)}
                stroke="#27272a" strokeWidth="1" strokeDasharray="4 4"
              />
              <text x={PAD.left - 8} y={yPos(s) + 4} fill="#52525b" fontSize="11" textAnchor="end">{s}</text>
            </g>
          ))}

          {/* Admin line */}
          {showAdmin && (
            <>
              <path d={linePath(points, 'admin')} fill="none"
                stroke="#7c3aed" strokeWidth="2" strokeOpacity="0.5" strokeDasharray="5 3" />
              {points.map((p, i) => p.admin === null ? null : (
                <circle key={i} cx={xPos(i)} cy={yPos(p.admin)} r="4"
                  fill="#7c3aed" fillOpacity="0.7" />
              ))}
            </>
          )}

          {/* User line */}
          {points.some(p => p.user !== null) && (
            <>
              <path d={linePath(points, 'user')} fill="none"
                stroke="#6366f1" strokeWidth="2.5"
                strokeLinejoin="round" strokeLinecap="round"
              />
              {points.map((p, i) => p.user === null ? null : (
                <circle key={i} cx={xPos(i)} cy={yPos(p.user)} r="5"
                  fill="#6366f1" stroke="#080808" strokeWidth="2" />
              ))}
            </>
          )}

          {/* Invisible hover targets + tooltip */}
          {points.map((p, i) => {
            const x = xPos(i)
            const score = p.user ?? p.admin
            if (score === null) return null
            const y = yPos(score)
            const isHov = hovered === i
            const tipW = 140
            // Flip tooltip to left side if near right edge
            const tipX = x + 16 + tipW > W - PAD.right ? x - tipW - 10 : x + 10

            return (
              <g key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}
              >
                {/* Large invisible hit area */}
                <rect
                  x={x - (chartW / points.length) / 2}
                  y={PAD.top}
                  width={chartW / points.length}
                  height={chartH}
                  fill="transparent"
                />

                {/* Vertical guide line on hover */}
                {isHov && (
                  <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + chartH}
                    stroke="#6366f1" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 3" />
                )}

                {/* Tooltip */}
                {isHov && (
                  <g>
                    <rect x={tipX} y={y - 38} width={tipW} height={showAdmin && p.admin ? 54 : 36}
                      rx="6" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
                    <text x={tipX + 10} y={y - 20} fill="#e4e4e7" fontSize="11" fontWeight="600">
                      {p.name}
                    </text>
                    <text x={tipX + 10} y={y - 7} fill="#71717a" fontSize="10">
                      {p.year}
                    </text>
                    {p.user !== null && (
                      <text x={tipX + 10} y={y + 8} fill="#a5b4fc" fontSize="10">
                        You: {p.user.toFixed(2)}
                      </text>
                    )}
                    {showAdmin && p.admin !== null && (
                      <text x={tipX + 70} y={y + 8} fill="#c4b5fd" fontSize="10" fillOpacity="0.7">
                        {adminName || 'Admin'}: {p.admin.toFixed(2)}
                      </text>
                    )}
                  </g>
                )}
              </g>
            )
          })}

          {/* X-axis: show year only when it changes from previous, rotated */}
          {points.map((p, i) => {
            const showYear = i === 0 || p.year !== points[i - 1].year
            if (!showYear) return null
            return (
              <text key={i}
                x={xPos(i)} y={H - 8}
                fill="#52525b" fontSize="10" textAnchor="middle"
                transform={`rotate(-35, ${xPos(i)}, ${H - 8})`}
              >
                {p.year}
              </text>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-1 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-5 h-px bg-indigo-500 rounded" style={{ height: '2px' }} />
          <span className="text-xs text-zinc-500">Your ratings</span>
        </div>
        {showAdmin && (
          <div className="flex items-center gap-2">
            <div className="w-5 rounded" style={{ height: '2px', background: '#7c3aed', opacity: 0.6, borderTop: '2px dashed #7c3aed' }} />
            <span className="text-xs text-zinc-500">{adminName || 'Admin'} ratings</span>
          </div>
        )}
      </div>
    </div>
  )
}
