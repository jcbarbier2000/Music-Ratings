import React, { useState } from 'react'

export default function AlbumChart({ albums, userRatings, adminRatings, isAdmin, adminName }) {
  const [hovered, setHovered] = useState(null)

  const points = albums
    .filter(a => a.year && /^(19|20)\d{2}$/.test(a.year.trim()))
    .map(a => {
      const songs = a.songs || []
      const avg = (ratingMap) => {
        const vals = songs.filter(s => !s.excluded).map(s => {
          const nameKey = s.name?.toLowerCase().trim()
          return ratingMap?.[s.id] || ratingMap?.__nameMap?.[nameKey] || 0
        }).filter(v => v > 0)
        if (!vals.length) return null
        return vals.reduce((s, v) => s + v, 0) / vals.length
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

  const xPos = i => PAD.left + (points.length === 1 ? chartW / 2 : (chartW / (points.length - 1)) * i)
  const yPos = val => PAD.top + chartH - ((val / 10) * chartH)

  const linePath = (pts, key) => {
    const valid = pts.map((p, i) => ({ ...p, i })).filter(p => p[key] !== null)
    return valid.map((p, j) => `${j === 0 ? 'M' : 'L'} ${xPos(p.i)} ${yPos(p[key])}`).join(' ')
  }

  const gridScores = [2, 4, 6, 8, 10]
  const showAdmin = !isAdmin && points.some(p => p.admin !== null)

  // Dot size scales down for large collections
  const dotR = points.length > 80 ? 2.5 : points.length > 40 ? 3.5 : 5

  // X-axis label logic: show year only when it changes, but skip if too crowded
  // Calculate minimum pixel spacing needed
  const minLabelSpacing = 28 // px
  const labelPositions = []
  const xLabels = points.map((p, i) => {
    const showYear = i === 0 || p.year !== points[i - 1].year
    if (!showYear) return null
    const x = xPos(i)
    // Check if too close to previous label
    if (labelPositions.length > 0 && x - labelPositions[labelPositions.length - 1] < minLabelSpacing) return null
    labelPositions.push(x)
    return { i, x, year: p.year }
  }).filter(Boolean)

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
              <line x1={PAD.left} y1={yPos(s)} x2={W - PAD.right} y2={yPos(s)}
                stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
              <text x={PAD.left - 8} y={yPos(s) + 4} fill="#52525b" fontSize="11" textAnchor="end">{s}</text>
            </g>
          ))}

          {/* Admin line */}
          {showAdmin && (
            <>
              <path d={linePath(points, 'admin')} fill="none"
                stroke="#7c3aed" strokeWidth="2" strokeOpacity="0.5" strokeDasharray="5 3" />
              {points.map((p, i) => p.admin === null ? null : (
                <circle key={i} cx={xPos(i)} cy={yPos(p.admin)} r={dotR - 1}
                  fill="#7c3aed" fillOpacity="0.7" />
              ))}
            </>
          )}

          {/* User line */}
          {points.some(p => p.user !== null) && (
            <>
              <path d={linePath(points, 'user')} fill="none"
                stroke="#6366f1" strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" />
              {points.map((p, i) => p.user === null ? null : (
                <circle key={i} cx={xPos(i)} cy={yPos(p.user)} r={dotR}
                  fill="#6366f1" stroke="#080808" strokeWidth={dotR > 3 ? 2 : 1} />
              ))}
            </>
          )}

          {/* Hover targets */}
          {points.map((p, i) => {
            const x = xPos(i)
            const score = p.user ?? p.admin
            if (score === null) return null
            const y = yPos(score)
            const isHov = hovered === i
            const tipW = 150
            const tipH = showAdmin && p.admin ? 58 : 40
            const tipX = x + 16 + tipW > W - PAD.right ? x - tipW - 10 : x + 10
            const tipY = y - tipH / 2

            return (
              <g key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}
              >
                <rect
                  x={x - (chartW / Math.max(points.length, 1)) / 2}
                  y={PAD.top} width={chartW / Math.max(points.length, 1)} height={chartH}
                  fill="transparent"
                />
                {isHov && (
                  <>
                    <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + chartH}
                      stroke="#6366f1" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 3" />
                    <rect x={tipX} y={tipY} width={tipW} height={tipH}
                      rx="6" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
                    <text x={tipX + 10} y={tipY + 16} fill="#e4e4e7" fontSize="11" fontWeight="600">
                      {p.name.length > 20 ? p.name.slice(0, 19) + '…' : p.name}
                    </text>
                    <text x={tipX + 10} y={tipY + 28} fill="#71717a" fontSize="10">{p.year}</text>
                    {p.user !== null && (
                      <text x={tipX + 10} y={tipY + 40} fill="#a5b4fc" fontSize="10">
                        You: {p.user.toFixed(2)}
                      </text>
                    )}
                    {showAdmin && p.admin !== null && (
                      <text x={tipX + 80} y={tipY + 40} fill="#c4b5fd" fontSize="10" fillOpacity="0.7">
                        {adminName || 'Admin'}: {p.admin.toFixed(2)}
                      </text>
                    )}
                  </>
                )}
              </g>
            )
          })}

          {/* X-axis labels */}
          {xLabels.map(({ i, x, year }) => (
            <text key={i} x={x} y={H - 8} fill="#52525b" fontSize="9" textAnchor="middle"
              transform={`rotate(-40, ${x}, ${H - 8})`}>
              {year}
            </text>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-1 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-5 rounded" style={{ height: '2px', background: '#6366f1' }} />
          <span className="text-xs text-zinc-500">Your ratings</span>
        </div>
        {showAdmin && (
          <div className="flex items-center gap-2">
            <div className="w-5 rounded" style={{ height: '2px', background: '#7c3aed', opacity: 0.6 }} />
            <span className="text-xs text-zinc-500">{adminName || 'Admin'} ratings</span>
          </div>
        )}
      </div>
    </div>
  )
}
