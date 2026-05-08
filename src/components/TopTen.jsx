import React, { useState, useEffect, useCallback } from 'react'
import { Trophy, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function TopTen({ user, profile, adminProfile, allProfiles, artists, onNavigateToArtist }) {
  const [compareUser, setCompareUser] = useState(null)
  const [myTopTen, setMyTopTen] = useState([])
  const [compareTopTen, setCompareTopTen] = useState([])
  const [loading, setLoading] = useState(true)

  const NON_ALBUM_LABELS = ['singles', 'features', 'b-sides', 'eps', 'live', 'demos', 'rarities', 'extras', 'other']

  // Default compare user to admin
  useEffect(() => {
    if (adminProfile && adminProfile.id !== user?.id) {
      setCompareUser(adminProfile)
    } else if (allProfiles.length > 0) {
      const other = allProfiles.find(p => p.id !== user?.id)
      setCompareUser(other || null)
    }
  }, [adminProfile, allProfiles, user])

  const fetchTopTen = useCallback(async (userId) => {
    if (!userId) return []

    // Get all albums with their songs
    const { data: albums } = await supabase
      .from('albums')
      .select('id, name, year, artist_id, image_url, songs(id), artists(id, name, image_url)')
      .order('name')

    const filtered = (albums || []).filter(a =>
      !NON_ALBUM_LABELS.includes(a.name.toLowerCase().trim())
    )

    // Get all ratings for this user
    const allSongIds = filtered.flatMap(a => a.songs.map(s => s.id))
    if (!allSongIds.length) return []

    const { data: ratings } = await supabase
      .from('ratings')
      .select('song_id, rating')
      .eq('user_id', userId)
      .in('song_id', allSongIds)

    const ratingMap = {}
    ;(ratings || []).forEach(r => { ratingMap[r.song_id] = r.rating })

    // Calculate average per album
    const scored = filtered
      .map(album => {
        const songRatings = album.songs.map(s => ratingMap[s.id]).filter(r => r !== undefined)
        if (songRatings.length === 0) return null
        const avg = songRatings.reduce((s, v) => s + v, 0) / songRatings.length
        return {
          albumId: album.id,
          albumName: album.name,
          albumYear: album.year,
          albumImage: album.image_url,
          artistId: album.artist_id,
          artistName: album.artists?.name || '',
          artistImage: album.artists?.image_url,
          avg,
          ratedCount: songRatings.length,
          totalCount: album.songs.length,
          complete: songRatings.length === album.songs.length,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.avg - a.avg)

    // Assign ranks with ties — include all albums tied at rank 10 or better
    const withRanks = []
    let rank = 1
    for (let i = 0; i < scored.length; i++) {
      if (rank > 10) break
      const current = scored[i]
      // Count how many share this score
      const sameScore = scored.filter(a => Math.abs(a.avg - current.avg) < 0.001)
      const tied = sameScore.length > 1
      withRanks.push({ ...current, rank, tied })
      // Advance rank by number sharing this score
      if (i + 1 < scored.length && Math.abs(scored[i + 1].avg - current.avg) < 0.001) {
        // Next is same score, keep rank
      } else {
        rank += sameScore.filter(a => withRanks.some(w => w.albumId === a.albumId)).length
      }
      // Skip duplicates already added
    }

    // Deduplicate and re-assign cleanly
    const result = []
    let currentRank = 1
    let i = 0
    while (i < scored.length) {
      const group = [scored[i]]
      while (i + 1 < scored.length && Math.abs(scored[i + 1].avg - scored[i].avg) < 0.001) {
        i++
        group.push(scored[i])
      }
      const tied = group.length > 1
      // Only include if this rank group starts at or before 10
      if (currentRank <= 10) {
        group.forEach(album => result.push({ ...album, rank: currentRank, tied }))
      }
      currentRank += group.length
      i++
    }

    return result
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [mine, theirs] = await Promise.all([
        fetchTopTen(user?.id),
        compareUser ? fetchTopTen(compareUser.id) : Promise.resolve([])
      ])
      setMyTopTen(mine)
      setCompareTopTen(theirs)
      setLoading(false)
    }
    load()
  }, [user, compareUser, fetchTopTen])

  useEffect(() => {
    if (!compareUser) return
    const load = async () => {
      const theirs = await fetchTopTen(compareUser.id)
      setCompareTopTen(theirs)
    }
    load()
  }, [compareUser, fetchTopTen])

  const rankColor = (i) => {
    if (i === 0) return 'text-amber-400'
    if (i === 1) return 'text-zinc-300'
    if (i === 2) return 'text-amber-600'
    return 'text-zinc-600'
  }

  const rankBg = (i) => {
    if (i === 0) return 'bg-amber-400/10 border-amber-400/20'
    if (i === 1) return 'bg-zinc-300/5 border-zinc-300/10'
    if (i === 2) return 'bg-amber-600/10 border-amber-600/20'
    return 'bg-zinc-900 border-zinc-800'
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
          {items.map((item, i) => (
            <div key={item.albumId}
              className={`flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/30 transition-colors ${item.rank <= 3 ? 'border-l-2 ' + (item.rank === 1 ? 'border-amber-400/40' : item.rank === 2 ? 'border-zinc-400/30' : 'border-amber-600/40') : ''}`}
            >
              {/* Rank */}
              <span className={`font-bold text-base w-8 text-center flex-shrink-0 ${rankColor(item.rank - 1)}`}>
                {item.tied ? `T${item.rank}` : item.rank}
              </span>

              {/* Album art */}
              {item.albumImage ? (
                <img src={item.albumImage} alt={item.albumName}
                  className="w-11 h-11 rounded-lg object-cover border border-zinc-700 flex-shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-zinc-600" />
                </div>
              )}

              {/* Info */}
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
                    <span className="text-xs text-zinc-600">
                      ({item.ratedCount}/{item.totalCount} songs)
                    </span>
                  )}
                </div>
              </div>

              {/* Score */}
              <div className="text-right flex-shrink-0">
                <span className={`text-lg font-bold ${rankColor(item.rank - 1)}`}>
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
          {/* My top 10 */}
          <TopTenTable
            title={`${profile?.username}'s Top 10`}
            items={myTopTen}
            emptyMessage="Rate some albums to see your top 10"
          />

          {/* Compare top 10 */}
          <TopTenTable
            title={`${compareUser?.username || '—'}'s Top 10`}
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
