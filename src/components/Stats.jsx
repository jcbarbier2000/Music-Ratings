import React, { useState, useEffect } from 'react'
import { Ticket, Star, Disc, Music, TrendingUp, BarChart2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { scoreColor } from '../lib/scoreColor'
import { getCountryName, getFlagUrl } from '../lib/countries'

const NON_ALBUM_LABELS = ['singles', 'features', 'b-sides', 'eps', 'live', 'demos', 'rarities', 'extras', 'other']

function getDecade(year) {
  if (!year) return null
  const y = parseInt(year)
  if (isNaN(y)) return null
  if (y < 1960) return 'Pre-1960'
  if (y < 1970) return '1960s'
  if (y < 1980) return '1970s'
  if (y < 1990) return '1980s'
  if (y < 2000) return '1990s'
  if (y < 2010) return '2000s'
  if (y < 2020) return '2010s'
  return '2020s'
}

function avg(arr) {
  if (!arr.length) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-violet-400" />
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{title}</h2>
    </div>
  )
}

function HBar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color || '#7c3aed' }} />
    </div>
  )
}

function ScoreBadge({ score }) {
  if (!score) return <span className="text-xs text-zinc-600">—</span>
  const c = scoreColor(score)
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded tabular-nums"
      style={{ backgroundColor: c + '33', color: c, border: `1px solid ${c}55` }}>
      {score.toFixed(2)}
    </span>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-sm font-medium text-zinc-300 mt-1">{label}</div>
      {sub && <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Stats({ user, profile, artists, artistScores, liveShowCounts }) {
  const [loading, setLoading] = useState(true)
  const [ratingDist, setRatingDist] = useState({})      // rating -> count
  const [albumScores, setAlbumScores] = useState([])    // [{name, artistName, year, avgScore, count}]
  const [topSongs, setTopSongs] = useState([])          // [{songName, albumName, artistName, rating}]

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)

    const [ratingsRes, songsRes] = await Promise.all([
      supabase.from('ratings').select('song_id, rating').eq('user_id', user.id).limit(1000000),
      supabase.from('songs').select('id, name, album_id, excluded, albums(id, name, year, artist_id, artists(id, name, genre, debut_year, country))').limit(1000000),
    ])

    const ratings = ratingsRes.data || []
    const songs = songsRes.data || []

    // Rating distribution
    const dist = {}
    for (let i = 1; i <= 10; i++) dist[i] = 0
    ratings.forEach(r => { if (dist[r.rating] !== undefined) dist[r.rating]++ })
    setRatingDist(dist)

    // Build song rating map
    const ratingMap = {}
    ratings.forEach(r => { ratingMap[r.song_id] = r.rating })

    // Per-album scores (only non-excluded songs in non-category albums)
    const albumMap = {}
    songs.forEach(s => {
      if (s.excluded) return
      const album = s.albums
      if (!album) return
      const albumName = album.name.toLowerCase().trim()
      if (NON_ALBUM_LABELS.includes(albumName)) return
      if (ratingMap[s.id] === undefined) return
      if (!albumMap[album.id]) {
        albumMap[album.id] = {
          name: album.name,
          year: album.year,
          artistName: album.artists?.name || '',
          artistId: album.artist_id,
          ratings: [],
        }
      }
      albumMap[album.id].ratings.push(ratingMap[s.id])
    })

    const albumList = Object.values(albumMap)
      .filter(a => a.ratings.length >= 3)
      .map(a => ({ ...a, avgScore: avg(a.ratings), count: a.ratings.length }))
      .sort((a, b) => b.avgScore - a.avgScore)
    setAlbumScores(albumList)

    // Top songs (rated 9 or 10)
    const top = songs
      .filter(s => !s.excluded && ratingMap[s.id] >= 9)
      .map(s => ({
        songName: s.name,
        albumName: s.albums?.name || '',
        artistName: s.albums?.artists?.name || '',
        rating: ratingMap[s.id],
      }))
      .sort((a, b) => b.rating - a.rating || a.songName.localeCompare(b.songName))
    setTopSongs(top)

    setLoading(false)
  }

  if (loading) return <div className="text-center py-24 text-zinc-600">Loading stats...</div>

  // Derived stats from props
  const scoredArtists = artists.filter(a => artistScores[a.id]?.myScore)
  const allMyScores = scoredArtists.map(a => artistScores[a.id].myScore)
  const totalRatings = Object.values(ratingDist).reduce((a, b) => a + b, 0)
  const totalTens = ratingDist[10] || 0
  const overallAvg = allMyScores.length ? avg(allMyScores) : null
  const liveTotal = Object.values(liveShowCounts).reduce((a, b) => a + b, 0)
  const liveArtistCount = Object.values(liveShowCounts).filter(c => c > 0).length

  // Rating distribution
  const maxDistCount = Math.max(...Object.values(ratingDist))

  // Genre breakdown
  const genreMap = {}
  scoredArtists.forEach(a => {
    const g = a.genre || 'Unknown'
    if (!genreMap[g]) genreMap[g] = []
    genreMap[g].push(artistScores[a.id].myScore)
  })
  const genreStats = Object.entries(genreMap)
    .map(([genre, scores]) => ({ genre, count: scores.length, avgScore: avg(scores) }))
    .filter(g => g.count >= 2)
    .sort((a, b) => b.avgScore - a.avgScore)
  const maxGenreCount = Math.max(...genreStats.map(g => g.count), 1)

  // Decade breakdown
  const decadeMap = {}
  scoredArtists.forEach(a => {
    const d = getDecade(a.debut_year) || 'Unknown'
    if (!decadeMap[d]) decadeMap[d] = []
    decadeMap[d].push(artistScores[a.id].myScore)
  })
  const DECADE_ORDER = ['Pre-1960', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s', 'Unknown']
  const decadeStats = Object.entries(decadeMap)
    .map(([decade, scores]) => ({ decade, count: scores.length, avgScore: avg(scores) }))
    .sort((a, b) => DECADE_ORDER.indexOf(a.decade) - DECADE_ORDER.indexOf(b.decade))
  const maxDecadeCount = Math.max(...decadeStats.map(d => d.count), 1)

  // Country breakdown (top 10 by artist count)
  const countryMap = {}
  scoredArtists.forEach(a => {
    if (!a.country) return
    const c = a.country.toUpperCase()
    if (!countryMap[c]) countryMap[c] = []
    countryMap[c].push(artistScores[a.id].myScore)
  })
  const countryStats = Object.entries(countryMap)
    .map(([code, scores]) => ({ code, count: scores.length, avgScore: avg(scores) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  const maxCountryCount = Math.max(...countryStats.map(c => c.count), 1)

  // Live shows leaderboard
  const liveLeaderboard = Object.entries(liveShowCounts)
    .filter(([, count]) => count > 0)
    .map(([artistId, count]) => ({
      name: artists.find(a => a.id === artistId)?.name || artistId,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  const topAlbums = albumScores.slice(0, 10)
  const bottomAlbums = [...albumScores].sort((a, b) => a.avgScore - b.avgScore).slice(0, 10)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Your Stats</h1>
        <p className="text-zinc-500 text-sm mt-1">A breakdown of {profile?.username}'s listening habits</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Songs Rated" value={totalRatings.toLocaleString()} />
        <StatCard label="Avg Score" value={overallAvg ? overallAvg.toFixed(2) : '—'} sub="across all artists" />
        <StatCard label="Tens Given" value={totalTens.toLocaleString()} sub={`${((totalTens / totalRatings) * 100).toFixed(1)}% of ratings`} />
        <StatCard label="Shows Attended" value={liveTotal.toLocaleString()} sub={`${liveArtistCount} different artists`} />
      </div>

      {/* Rating Distribution */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <SectionHeader icon={BarChart2} title="Rating Distribution" />
        <div className="space-y-2">
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => {
            const count = ratingDist[r] || 0
            const pct = totalRatings > 0 ? ((count / totalRatings) * 100).toFixed(1) : '0.0'
            return (
              <div key={r} className="flex items-center gap-3">
                <span className="text-xs font-bold w-4 text-right tabular-nums"
                  style={{ color: scoreColor(r) }}>{r}</span>
                <HBar value={count} max={maxDistCount} color={scoreColor(r)} />
                <span className="text-xs text-zinc-400 w-10 text-right tabular-nums">{count.toLocaleString()}</span>
                <span className="text-xs text-zinc-600 w-10 text-right tabular-nums">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Genre & Decade side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Genre Breakdown */}
        {genreStats.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <SectionHeader icon={Music} title="By Genre" />
            <div className="space-y-3">
              {genreStats.map(({ genre, count, avgScore }) => (
                <div key={genre}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300 truncate">{genre}</span>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-xs text-zinc-600">{count} artists</span>
                      <ScoreBadge score={avgScore} />
                    </div>
                  </div>
                  <HBar value={count} max={maxGenreCount} color={scoreColor(avgScore)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decade Breakdown */}
        {decadeStats.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <SectionHeader icon={TrendingUp} title="By Era" />
            <div className="space-y-3">
              {decadeStats.map(({ decade, count, avgScore }) => (
                <div key={decade}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300">{decade}</span>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-xs text-zinc-600">{count} artists</span>
                      <ScoreBadge score={avgScore} />
                    </div>
                  </div>
                  <HBar value={count} max={maxDecadeCount} color={scoreColor(avgScore)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Country Breakdown */}
      {countryStats.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <SectionHeader icon={TrendingUp} title="Top Countries" />
          <div className="space-y-3">
            {countryStats.map(({ code, count, avgScore }) => (
              <div key={code}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getFlagUrl(code) && (
                      <img src={getFlagUrl(code)} alt={code}
                        className="w-5 h-3.5 object-cover rounded-sm border border-zinc-700 flex-shrink-0" />
                    )}
                    <span className="text-sm text-zinc-300">{getCountryName(code)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs text-zinc-600">{count} artists</span>
                    <ScoreBadge score={avgScore} />
                  </div>
                </div>
                <HBar value={count} max={maxCountryCount} color={scoreColor(avgScore)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top & Bottom Albums */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <SectionHeader icon={Disc} title="Top Albums" />
          {topAlbums.length === 0 ? (
            <p className="text-sm text-zinc-600">Not enough rated albums yet</p>
          ) : (
            <div className="space-y-2">
              {topAlbums.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-zinc-600 w-5 text-right flex-shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">{a.name}</div>
                      <div className="text-xs text-zinc-500 truncate">{a.artistName}{a.year ? ` · ${a.year}` : ''}</div>
                    </div>
                  </div>
                  <ScoreBadge score={a.avgScore} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <SectionHeader icon={Disc} title="Bottom Albums" />
          {bottomAlbums.length === 0 ? (
            <p className="text-sm text-zinc-600">Not enough rated albums yet</p>
          ) : (
            <div className="space-y-2">
              {bottomAlbums.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-zinc-600 w-5 text-right flex-shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">{a.name}</div>
                      <div className="text-xs text-zinc-500 truncate">{a.artistName}{a.year ? ` · ${a.year}` : ''}</div>
                    </div>
                  </div>
                  <ScoreBadge score={a.avgScore} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Songs */}
      {topSongs.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <SectionHeader icon={Star} title={`Favourite Songs (9–10) · ${topSongs.length} total`} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {topSongs.slice(0, 40).map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-0.5">
                <div className="min-w-0">
                  <span className="text-sm text-white truncate">{s.songName}</span>
                  <span className="text-xs text-zinc-500 ml-2 truncate">{s.artistName}</span>
                </div>
                <ScoreBadge score={s.rating} />
              </div>
            ))}
          </div>
          {topSongs.length > 40 && (
            <p className="text-xs text-zinc-600 mt-3">…and {topSongs.length - 40} more</p>
          )}
        </div>
      )}

      {/* Live Shows Leaderboard */}
      {liveLeaderboard.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <SectionHeader icon={Ticket} title="Live Shows" />
          <div className="space-y-3">
            {liveLeaderboard.map(({ name, count }, i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs text-zinc-600 w-5 text-right flex-shrink-0">{i + 1}</span>
                <span className="text-sm text-zinc-300 flex-1 truncate">{name}</span>
                <HBar value={count} max={liveLeaderboard[0].count} color="#10b981" />
                <span className="text-xs font-bold text-emerald-400 w-6 text-right tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
