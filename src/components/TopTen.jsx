import React, { useState, useEffect, useMemo } from 'react'
import { Trophy, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

const NON = ['singles', 'features', 'b-sides', 'eps', 'live', 'demos', 'rarities', 'extras', 'other']
const isNonAlbum = (name) => NON.some(label => name.toLowerCase().trim().includes(label))

async function fetchTopTen(userId) {
  if (!userId) return []
  try {
    const [albumsRes, songsRes, ratingsRes, artistsRes] = await Promise.all([
      supabase.from('albums').select('id, name, year, genre, subgenre, artist_id, image_url').limit(1000000),
      supabase.from('songs').select('id, name, album_id, excluded').limit(1000000),
      supabase.from('ratings').select('song_id, rating').eq('user_id', userId).limit(1000000),
      supabase.from('artists').select('id, name, genre, subgenre, image_url').limit(1000000),
    ])

    const allAlbums = (albumsRes.data || []).filter(a => !isNonAlbum(a.name))
    const allSongs = songsRes.data || []
    const ratingMap = {}
    ;(ratingsRes.data || []).forEach(r => { ratingMap[r.song_id] = r.rating })
    const artistMap = {}
    ;(artistsRes.data || []).forEach(a => { artistMap[a.id] = a })

    const albumSongMap = {}
    allSongs.forEach(s => {
      if (s.excluded) return
      if (!albumSongMap[s.album_id]) albumSongMap[s.album_id] = []
      albumSongMap[s.album_id].push(s)
    })

    const scored = allAlbums.map(album => {
      const songs = albumSongMap[album.id] || []
      const seenNames = new Set()
      const uniqueSongs = songs.filter(s => {
        const key = s.name.toLowerCase().trim()
        if (seenNames.has(key)) return false
        seenNames.add(key)
        return true
      })
      const rated = uniqueSongs.map(s => ratingMap[s.id]).filter(v => v !== undefined)
      if (!rated.length) return null
      const avg = rated.reduce((s, v) => s + v, 0) / rated.length
      const artist = artistMap[album.artist_id]
      return {
        albumId: album.id,
        albumName: album.name,
        albumYear: album.year,
        albumImage: album.image_url,
        // Album-level genre/subgenre, fall back to artist's
        genre: album.genre || artist?.genre || null,
        subgenre: album.subgenre || artist?.subgenre || null,
        artistId: album.artist_id,
        artistName: artist?.name || '',
        avg,
        ratedCount: rated.length,
        totalCount: uniqueSongs.length,
        complete: rated.length === uniqueSongs.length,
      }
    }).filter(Boolean).sort((a, b) => b.avg - a.avg)

    // Assign ranks with ties (across full unfiltered list)
    const withRanks = []
    let rank = 1
    let i = 0
    while (i < scored.length) {
      const group = [scored[i]]
      while (i + 1 < scored.length && Math.abs(scored[i + 1].avg - scored[i].avg) < 0.001) {
        i++
        group.push(scored[i])
      }
      group.forEach(a => withRanks.push({ ...a, rank, tied: group.length > 1 }))
      rank += group.length
      i++
    }
    return withRanks
  } catch (err) {
    console.error('TopTen error:', err)
    return []
  }
}

const rankColor = (rank) => {
  if (rank === 1) return 'text-amber-400'
  if (rank === 2) return 'text-zinc-300'
  if (rank === 3) return 'text-amber-600'
  return 'text-zinc-600'
}

function FilterBar({ allItems, filters, setFilters }) {
  const genres = useMemo(() =>
    [...new Set(allItems.map(a => a.genre).filter(Boolean))].sort(), [allItems])
  const subgenres = useMemo(() =>
    [...new Set(allItems.map(a => a.subgenre).filter(Boolean))].sort(), [allItems])
  const years = useMemo(() =>
    [...new Set(allItems.map(a => a.albumYear).filter(Boolean))].sort((a, b) => b - a), [allItems])

  const set = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  const active = [filters.genre, filters.subgenre, filters.year].filter(Boolean).length

  if (!genres.length && !subgenres.length && !years.length) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {genres.length > 0 && (
        <div className="relative">
          <select value={filters.genre} onChange={e => set('genre', e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 bg-zinc-800 border border-zinc-700 text-sm text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer">
            <option value="">All Genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
        </div>
      )}
      {subgenres.length > 0 && (
        <div className="relative">
          <select value={filters.subgenre} onChange={e => set('subgenre', e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 bg-zinc-800 border border-zinc-700 text-sm text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer">
            <option value="">All Subgenres</option>
            {subgenres.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
        </div>
      )}
      {years.length > 0 && (
        <div className="relative">
          <select value={filters.year} onChange={e => set('year', e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 bg-zinc-800 border border-zinc-700 text-sm text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer">
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
        </div>
      )}
      {active > 0 && (
        <button onClick={() => setFilters({ genre: '', subgenre: '', year: '' })}
          className="px-3 py-2 text-sm text-zinc-500 hover:text-white transition-colors">
          Clear
          <span className="ml-1.5 text-xs bg-violet-600 text-white px-1.5 py-0.5 rounded-full">{active}</span>
        </button>
      )}
    </div>
  )
}

function applyFilters(items, filters) {
  let list = items
  if (filters.genre) list = list.filter(a => a.genre === filters.genre)
  if (filters.subgenre) list = list.filter(a => a.subgenre === filters.subgenre)
  if (filters.year) list = list.filter(a => a.albumYear === filters.year)
  // Re-rank after filtering
  const reranked = []
  let rank = 1
  let i = 0
  while (i < list.length) {
    const group = [list[i]]
    while (i + 1 < list.length && Math.abs(list[i + 1].avg - list[i].avg) < 0.001) {
      i++
      group.push(list[i])
    }
    if (rank <= 10) {
      group.forEach(a => reranked.push({ ...a, rank, tied: group.length > 1 }))
    }
    rank += group.length
    i++
  }
  return reranked
}

export default function TopTen({ user, profile, adminProfile, allProfiles, artists, onNavigateToArtist }) {
  const [compareUser, setCompareUser] = useState(null)
  const [myTopTen, setMyTopTen] = useState([])
  const [compareTopTen, setCompareTopTen] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ genre: '', subgenre: '', year: '' })

  useEffect(() => {
    if (adminProfile && adminProfile.id !== user?.id) {
      setCompareUser(adminProfile)
    } else {
      const other = allProfiles.find(p => p.id !== user?.id)
      setCompareUser(other || null)
    }
  }, [adminProfile, allProfiles, user])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetchTopTen(user.id).then(data => {
      setMyTopTen(data)
      setLoading(false)
    })
  }, [user])

  useEffect(() => {
    if (!compareUser) { setCompareTopTen([]); return }
    fetchTopTen(compareUser.id).then(setCompareTopTen)
  }, [compareUser])

  // Derive filter options from union of both lists
  const allItems = useMemo(() => {
    const seen = new Set()
    return [...myTopTen, ...compareTopTen].filter(a => {
      if (seen.has(a.albumId)) return false
      seen.add(a.albumId)
      return true
    })
  }, [myTopTen, compareTopTen])

  const myFiltered = useMemo(() => applyFilters(myTopTen, filters), [myTopTen, filters])
  const compareFiltered = useMemo(() => applyFilters(compareTopTen, filters), [compareTopTen, filters])

  const TopTenTable = ({ title, items, emptyMessage, headerRight }) => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-white">{title}</h3>
        </div>
        {headerRight}
      </div>
      {items.length === 0 ? (
        <div className="px-6 py-12 text-center text-zinc-600 text-sm">{emptyMessage}</div>
      ) : (
        <div className="divide-y divide-zinc-800/60">
          {items.map(item => (
            <div key={item.albumId}
              className={`flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/30 transition-colors ${item.rank <= 3 ? 'border-l-2 ' + (item.rank === 1 ? 'border-amber-400/40' : item.rank === 2 ? 'border-zinc-400/30' : 'border-amber-600/40') : ''}`}
            >
              <span className={`font-bold text-base w-8 text-center flex-shrink-0 ${rankColor(item.rank)}`}>
                {item.tied ? `T${item.rank}` : item.rank}
              </span>
              {item.albumImage ? (
                <img src={item.albumImage} alt={item.albumName}
                  className="w-11 h-11 rounded-lg object-cover border border-zinc-700 flex-shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-zinc-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm truncate">{item.albumName}</div>
                <button
                  onClick={() => {
                    const artist = artists.find(a => a.id === item.artistId)
                    if (artist) onNavigateToArtist(artist)
                  }}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors truncate block text-left"
                >
                  {item.artistName}
                </button>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {item.albumYear && <span className="text-xs text-zinc-600">{item.albumYear}</span>}
                  {item.genre && <span className="text-xs text-zinc-600">{item.genre}{item.subgenre ? ` · ${item.subgenre}` : ''}</span>}
                  {!item.complete && <span className="text-xs text-zinc-600">({item.ratedCount}/{item.totalCount} songs)</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-lg font-bold ${rankColor(item.rank)}`}>{item.avg.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const otherUsers = allProfiles.filter(p => p.id !== user?.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Album Top 10</h1>
        <p className="text-zinc-500 text-sm mt-1">Ranked by average song rating · includes partially rated albums</p>
      </div>

      {!loading && (
        <FilterBar allItems={allItems} filters={filters} setFilters={setFilters} />
      )}

      {loading ? (
        <div className="text-center py-16 text-zinc-600">Calculating rankings...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopTenTable
            title={`${profile?.username}'s Top 10`}
            items={myFiltered}
            emptyMessage="Rate some albums to see your top 10"
          />
          <TopTenTable
            title={compareUser ? `${compareUser.username}'s Top 10` : "— 's Top 10"}
            items={compareFiltered}
            emptyMessage={compareUser ? `${compareUser.username} hasn't rated any albums yet` : 'Select a user to compare'}
            headerRight={
              otherUsers.length > 0 ? (
                <div className="relative">
                  <select
                    value={compareUser?.id || ''}
                    onChange={e => {
                      const p = allProfiles.find(p => p.id === e.target.value) || null
                      setCompareUser(p)
                    }}
                    className="appearance-none bg-zinc-800 border border-zinc-700 text-white text-xs pl-3 pr-8 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">— Select user —</option>
                    {otherUsers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.username}{p.is_admin ? ' (Admin)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                </div>
              ) : null
            }
          />
        </div>
      )}
    </div>
  )
}
