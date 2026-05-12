import React, { useState, useEffect, useCallback } from 'react'
import { Trophy, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function TopTen({ user, profile, adminProfile, allProfiles, artists, onNavigateToArtist }) {
  const [compareUser, setCompareUser] = useState(null)
  const [myTopTen, setMyTopTen] = useState([])
  const [compareTopTen, setCompareTopTen] = useState([])
  const [loading, setLoading] = useState(true)

  const NON_ALBUM_LABELS = ['singles', 'features', 'b-sides', 'eps', 'live', 'demos', 'rarities', 'extras', 'other']
  const isNonAlbum = (name) => NON_ALBUM_LABELS.some(label => name.toLowerCase().trim().includes(label))

  useEffect(() => {
    if (adminProfile && adminProfile.id !== user?.id) {
      setCompareUser(adminProfile)
    } else {
      const other = allProfiles.find(p => p.id !== user?.id)
      setCompareUser(other || null)
    }
  }, [adminProfile, allProfiles, user])

  const fetchTopTen = useCallback(async (userId) => {
    if (!userId) return []

    try {
      // Flat queries to avoid row limits
      const [albumsRes, songsRes, ratingsRes, artistsRes] = await Promise.all([
        supabase.from('albums').select('id, name, year, artist_id, image_url').limit(10000),
        supabase.from('songs').select('id, name, album_id').limit(10000),
        supabase.from('ratings').select('song_id, rating').eq('user_id', userId).limit(10000),
        supabase.from('artists').select('id, name, image_url').limit(10000),
      ])

      const allAlbums = (albumsRes.data || []).filter(a => !isNonAlbum(a.name))
      const allSongs = songsRes.data || []
      const ratingMap = {}
      ;(ratingsRes.data || []).forEach(r => { ratingMap[r.song_id] = r.rating })

      console.log('TopTen scoring:', {
        albums: allAlbums.length,
        songs: allSongs.length,
        ratings: Object.keys(ratingMap).length,
        sampleAlbumId: allAlbums[0]?.id,
        songsForFirstAlbum: albumSongMap ? 'building...' : 'not built',
      })

      // Build artist lookup from fresh data
      const artistMap = {}
      ;(artistsRes.data || []).forEach(a => { artistMap[a.id] = a })

      // Build albumId -> songs map
      const albumSongMap = {}
      allSongs.forEach(s => {
        if (!albumSongMap[s.album_id]) albumSongMap[s.album_id] = []
        albumSongMap[s.album_id].push(s)
      })

      console.log('TopTen albumSongMap sample:', {
        firstAlbumId: allAlbums[0]?.id,
        firstAlbumName: allAlbums[0]?.name,
        songsForFirstAlbum: albumSongMap[allAlbums[0]?.id]?.length,
        totalAlbumIds: Object.keys(albumSongMap).length,
      })

      // Score each album — deduplicate songs by name within album
      const scored = allAlbums.map(album => {
        const songs = albumSongMap[album.id] || []
        // Deduplicate by song name
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
          artistId: album.artist_id,
          artistName: artist?.name || '',
          artistImage: artist?.image_url,
          avg,
          ratedCount: rated.length,
          totalCount: uniqueSongs.length,
          complete: rated.length === uniqueSongs.length,
        }
      }).filter(Boolean).sort((a, b) => b.avg - a.avg)

      // Assign ranks with ties, include all tied at rank 10
      const result = []
      let currentRank = 1
      let i = 0
      while (i < scored.length) {
        const group = [scored[i]]
        while (i + 1 < scored.length && Math.abs(scored[i + 1].avg - scored[i].avg) < 0.001) {
          i++
          group.push(scored[i])
        }
        if (currentRank <= 10) {
          group.forEach(album => result.push({ ...album, rank: currentRank, tied: group.length > 1 }))
        }
        currentRank += group.length
        i++
      }

      return result
    } catch (err) {
      console.error('TopTen fetch error:', err)
      return []
    }
  }, [artists])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const mine = await fetchTopTen(user?.id)
      setMyTopTen(mine)
      setLoading(false)
    }
    if (user && artists.length > 0) load()
  }, [user, artists, fetchTopTen])

  useEffect(() => {
    const load = async () => {
      if (!compareUser) { setCompareTopTen([]); return }
      const theirs = await fetchTopTen(compareUser.id)
      setCompareTopTen(theirs)
    }
    load()
  }, [compareUser, fetchTopTen])

  const rankColor = (rank) => {
    if (rank === 1) return 'text-amber-400'
    if (rank === 2) return 'text-zinc-300'
    if (rank === 3) return 'text-amber-600'
    return 'text-zinc-600'
  }

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
          {items.map((item) => (
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
                <div className="flex items-center gap-2 mt-0.5">
                  {item.albumYear && <span className="text-xs text-zinc-600">{item.albumYear}</span>}
                  {!item.complete && (
                    <span className="text-xs text-zinc-600">({item.ratedCount}/{item.totalCount} songs)</span>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className={`text-lg font-bold ${rankColor(item.rank)}`}>
                  {item.avg.toFixed(2)}
                </span>
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

      {loading ? (
        <div className="text-center py-16 text-zinc-600">Calculating rankings...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopTenTable
            title={`${profile?.username}'s Top 10`}
            items={myTopTen}
            emptyMessage="Rate some albums to see your top 10"
          />

          <TopTenTable
            title={compareUser ? `${compareUser.username}'s Top 10` : "— 's Top 10"}
            items={compareTopTen}
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
