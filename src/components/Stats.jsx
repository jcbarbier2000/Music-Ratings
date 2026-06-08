import React, { useState, useEffect } from 'react'
import { Ticket, Star, Disc, Music, TrendingUp, BarChart2, ChevronDown } from 'lucide-react'
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

export default function Stats({ user, profile, artists, allProfiles }) {
  const [viewingId, setViewingId] = useState(user?.id)
  const [loading, setLoading] = useState(true)

  // All computed state for the viewed user
  const [ratingDist, setRatingDist] = useState({})
  const [albumScores, setAlbumScores] = useState([])
  const [topSongs, setTopSongs] = useState([])
  const [artistScoreMap, setArtistScoreMap] = useState({}) // artistId -> avgScore
  const [liveShowCounts, setLiveShowCounts] = useState({}) // artistId -> count

  // Songs only need to be fetched once — they don't change per user
  const [songs, setSongs] = useState(null)

  useEffect(() => {
    supabase
      .from('songs')
      .select('id, name, excluded, albums(id, name, year, artist_id, artists(id, name, genre, debut_year, country))')
      .limit(1000000)
      .then(({ data }) => setSongs(data || []))
  }, [])

  useEffect(() => {
    if (!viewingId || !songs) return
    loadUserData(viewingId)
  }, [viewingId, songs])

  const loadUserData = async (userId) => {
    setLoading(true)

    const [ratingsRes, liveRes] = await Promise.all([
      supabase.from('ratings').select('song_id, rating').eq('user_id', userId).limit(1000000),
      supabase.from('live_shows').select('artist_id, count').eq('user_id', userId),
    ])

    const ratings = ratingsRes.data || []
    const ratingMap = {}
    ratings.forEach(r => { ratingMap[r.song_id] = r.rating })

    // Live shows
    const liveMap = {}
    ;(liveRes.data || []).forEach(r => { liveMap[r.artist_id] = r.count })
    setLiveShowCounts(liveMap)

    // Rating distribution
    const dist = {}
    for (let i = 1; i <= 10; i++) dist[i] = 0
    ratings.forEach(r => { if (dist[r.rating] !== undefined) dist[r.rating]++ })
    setRatingDist(dist)

    // Per-artist scores (deduplicated by song name per artist)
    const artistSongMap = {} // artistId -> songNameKey -> rating
    songs.forEach(s => {
      if (s.excluded || ratingMap[s.id] === undefined) return
      const artistId = s.albums?.artist_id
      if (!artistId) return
      if (!artistSongMap[artistId]) artistSongMap[artistId] = {}
      const key = s.name.toLowerCase().trim()
      // Prefer the rated instance (already have it since we're iterating rated songs)
      artistSongMap[artistId][key] = ratingMap[s.id]
    })
    const aScores = {}
    Object.entries(artistSongMap).forEach(([artistId, nameMap]) => {
      const vals = Object.values(nameMap)
      if (vals.length) aScores[artistId] = avg(vals)
    })
    setArtistScoreMap(aScores)

    // Per-album scores
    const albumMap = {}
    songs.forEach(s => {
      if (s.excluded) return
      const album = s.albums
      if (!album || NON_ALBUM_LABELS.includes(album.name.toLowerCase().trim())) return
      if (ratingMap[s.id] === undefined) return
      if (!albumMap[album.id]) {
        albumMap[album.id] = { name: album.name, year: album.year, artistName: album.artists?.name || '', ratings: [] }
      }
      albumMap[album.id].ratings.push(ratingMap[s.id])
    })
    const albumList = Object.values(albumMap)
      .filter(a => a.ratings.length >= 3)
      .map(a => ({ ...a, avgScore: avg(a.ratings) }))
      .sort((a, b) => b.avgScore - a.avgScore)
    setAlbumScores(albumList)

    // Top songs (9–10)
    const top = songs
      .filter(s => !s.excluded && ratingMap[s.id] >= 9)
      .map(s => ({
        songName: s.name,
        artistName: s.albums?.artists?.name || '',
        rating: ratingMap[s.id],
      }))
      .sort((a, b) => b.rating - a.rating || a.songName.localeCompare(b.songName))
    setTopSongs(top)

    setLoading(false)
  }

  const viewingProfile = allProfiles.find(p => p.id === viewingId) || profile
  const otherProfiles = allProfiles.filter(p => p.id !== user?.id)

  // Derived
  const totalRatings = Object.values(ratingDist).reduce((a, b) => a + b, 0)
  const totalTens = ratingDist[10] || 0
  const allScores = Object.values(artistScoreMap)
  const overallAvg = allScores.length ? avg(allScores) : null
  const liveTotal = Object.values(liveShowCounts).reduce((a, b) => a + b, 0)
  const liveArtistCount = Object.keys(liveShowCounts).length
  const maxDistCount = Math.max(...Object.values(ratingDist), 1)

  // Scored artists (artists that have a score for this user)
  const scoredArtists = artists.filter(a => artistScoreMap[a.id] !== undefined)

  // Genre breakdown
  const genreMap = {}
  scoredArtists.forEach(a => {
    const g = a.genre || 'Unknown'
    if (!genreMap[g]) genreMap[g] = []
    genreMap[g].push(artistScoreMap[a.id])
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
    decadeMap[d].push(artistScoreMap[a.id])
  })
  const DECADE_ORDER = ['Pre-1960', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s', 'Unknown']
  const decadeStats = Object.entries(decadeMap)
    .map(([decade, scores]) => ({ decade, count: scores.length, avgScore: avg(scores) }))
    .sort((a, b) => DECADE_ORDER.indexOf(a.decade) - DECADE_ORDER.indexOf(b.decade))
  const maxDecadeCount = Math.max(...decadeStats.map(d => d.count), 1)

  // Country breakdown
  const countryMap = {}
  scoredArtists.forEach(a => {
    if (!a.country) return
    const c = a.country.toUpperCase()
    if (!countryMap[c]) countryMap[c] = []
    countryMap[c].push(artistScoreMap[a.id])
  })
  const countryStats = Object.entries(countryMap)
    .map(([code, scores]) => ({ code, count: scores.length, avgScore: avg(scores) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  const maxCountryCount = Math.max(...countryStats.map(c => c.count), 1)

  // Live leaderboard
  const liveLeaderboard = Object.entries(liveShowCounts)
    .map(([artistId, count]) => ({ name: artists.find(a => a.id === artistId)?.name || '?', count }))
    .sort((a, b) => b.count - a.count)

  const topAlbums = albumScores.slice(0, 10)
  const bottomAlbums = [...albumScores].sort((a, b) => a.avgScore - b.avgScore).slice(0, 10)

  return (
    <div className="space-y-8">
      {/* Header + profile selector */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Stats</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Listening habits for <span className="text-zinc-300 font-medium">{viewingProfile?.username}</span>
          </p>
        </div>
        {allProfiles.length > 1 && (
          <div className="relative">
            <select
              value={viewingId}
              onChange={e => setViewingId(e.target.value)}
              className="appearance-none pl-4 pr-8 py-2.5 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
            >
              <option value={user?.id}>{profile?.username} (you)</option>
              {otherProfiles.map(p => (
                <option key={p.id} value={p.id}>{p.username}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-24 text-zinc-600">Loading stats...</div>
      ) : (
        <>
          {/* Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Songs Rated" value={totalRatings.toLocaleString()} />
            <StatCard label="Avg Score" value={overallAvg ? overallAvg.toFixed(2) : '—'} sub="across all artists" />
            <StatCard label="Tens Given" value={totalTens.toLocaleString()}
              sub={totalRatings > 0 ? `${((totalTens / totalRatings) * 100).toFixed(1)}% of ratings` : undefined} />
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
                    <span className="text-xs font-bold w-4 text-right tabular-nums" style={{ color: scoreColor(r) }}>{r}</span>
                    <HBar value={count} max={maxDistCount} color={scoreColor(r)} />
                    <span className="text-xs text-zinc-400 w-10 text-right tabular-nums">{count.toLocaleString()}</span>
                    <span className="text-xs text-zinc-600 w-10 text-right tabular-nums">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Genre & Decade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Countries */}
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
                      <span className="text-xs text-zinc-500 ml-2">{s.artistName}</span>
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

          {/* Live Shows */}
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
        </>
      )}
    </div>
  )
}
