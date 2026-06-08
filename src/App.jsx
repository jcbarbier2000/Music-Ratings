import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Music, Home, TrendingUp, Disc, ListMusic, Plus, Minus, Trash2, LogOut, Upload, ChevronLeft, X, Pencil, ChevronDown, ChevronUp, ArrowUp, Calendar, Users, Trophy, Check, Ticket, BarChart2 } from 'lucide-react'
import { supabase } from './lib/supabase'
import { useAuth } from './hooks/useAuth'
import Login from './components/Login'
import StarRating from './components/StarRating'
import AlbumChart from './components/AlbumChart'
import ImportModal from './components/ImportModal'
import ImageUpload from './components/ImageUpload'
import ResetPassword from './components/ResetPassword'
import MonthlyPicks from './components/MonthlyPicks'
import Requests from './components/Requests'
import HomeFilters, { getDecade } from './components/HomeFilters'
import TopTen from './components/TopTen'
import Stats from './components/Stats'
import { getCountryName, getFlagUrl } from './lib/countries'
import { scoreColor } from './lib/scoreColor'

export default function App() {
  const { user, profile, isAdmin, loading, signIn, signUp, signOut, resetPassword } = useAuth()
  const [page, setPage] = useState('home')
  const [artists, setArtists] = useState([])
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [artistDetail, setArtistDetail] = useState(null)
  const [userRatings, setUserRatings] = useState({})
  const [adminRatings, setAdminRatings] = useState({})
  const [adminProfile, setAdminProfile] = useState(undefined)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ genre: '', subgenre: '', country: '', decade: '', minScore: '', seenLive: false, newMusic: false, sortBy: 'az' })
  const [dataLoading, setDataLoading] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showAddAlbum, setShowAddAlbum] = useState(false)
  const [showEditArtist, setShowEditArtist] = useState(false)
  const [showEditAlbum, setShowEditAlbum] = useState(false)
  const [editingAlbum, setEditingAlbum] = useState(null)
  const [editAlbumName, setEditAlbumName] = useState('')
  const [editAlbumYear, setEditAlbumYear] = useState('')
  const [editAlbumGenre, setEditAlbumGenre] = useState('')
  const [editAlbumSubgenre, setEditAlbumSubgenre] = useState('')
  const [editAlbumImageUrl, setEditAlbumImageUrl] = useState('')
  const [newSongName, setNewSongName] = useState('')
  const [editingSongId, setEditingSongId] = useState(null)
  const [editingSongName, setEditingSongName] = useState('')
  const [insertAfterIdx, setInsertAfterIdx] = useState(null) // null = end
  const [editGenre, setEditGenre] = useState('')
  const [editSubgenre, setEditSubgenre] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editDebutYear, setEditDebutYear] = useState('')
  const [editCountry, setEditCountry] = useState('')
  const [newAlbumName, setNewAlbumName] = useState('')
  const [newAlbumYear, setNewAlbumYear] = useState('')
  const [newAlbumImageUrl, setNewAlbumImageUrl] = useState('')
  const [newSongs, setNewSongs] = useState('')
  const [collapsedAlbums, setCollapsedAlbums] = useState({})
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [allProfiles, setAllProfiles] = useState([])
  const [compareProfile, setCompareProfile] = useState(null) // profile to compare against
  const [compareRatings, setCompareRatings] = useState({})
  const [stats, setStats] = useState(null)
  const [siteSettings, setSiteSettings] = useState({ artist_in_review: null, artist_on_deck: null })
  const [showEditSettings, setShowEditSettings] = useState(false)
  const [settingsInReview, setSettingsInReview] = useState('')
  const [settingsOnDeck, setSettingsOnDeck] = useState('')
  const [artistScores, setArtistScores] = useState({}) // artistId -> { myScore, compareScore }
  const [newPickTitles, setNewPickTitles] = useState({ songs: new Set(), albums: new Set() })
  const [newMusicArtistIds, setNewMusicArtistIds] = useState(new Set())
  const [liveShowCounts, setLiveShowCounts] = useState({})
  const [artistTab, setArtistTab] = useState('albums')

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const toggleAlbum = (albumId) => {
    setCollapsedAlbums(prev => ({ ...prev, [albumId]: !prev[albumId] }))
  }

  const collapseAll = () => {
    const all = {}
    artistDetail?.albums.forEach(a => { all[a.id] = true })
    setCollapsedAlbums(all)
  }

  const expandAll = () => setCollapsedAlbums({})

  const slugify = (name) =>
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  // Store the intended slug from the URL on initial load
  const pendingSlugRef = useRef(
    window.location.pathname.match(/^\/artist\/(.+)$/)?.[1] ||
    (window.location.pathname === '/monthly' ? 'monthly' : null) ||
    (window.location.pathname === '/topten' ? 'topten' : null) ||
    (window.location.pathname === '/requests' ? 'requests' : null) ||
    (window.location.pathname === '/stats' ? 'stats' : null)
  )

  // Sync page state to URL
  useEffect(() => {
    if (pendingSlugRef.current) return
    if (page === 'artist' && selectedArtist) {
      window.history.replaceState(null, '', `/artist/${slugify(selectedArtist.name)}`)
    } else if (page === 'monthly') {
      window.history.replaceState(null, '', '/monthly')
    } else if (page === 'topten') {
      window.history.replaceState(null, '', '/topten')
    } else if (page === 'stats') {
      window.history.replaceState(null, '', '/stats')
    } else if (page === 'requests') {
      window.history.replaceState(null, '', '/requests')
    } else {
      window.history.replaceState(null, '', '/')
    }
  }, [page, selectedArtist])

  // Restore page from URL once artists are loaded
  useEffect(() => {
    if (!pendingSlugRef.current) return
    const slug = pendingSlugRef.current
    if (['monthly', 'topten', 'requests', 'stats'].includes(slug)) {
      pendingSlugRef.current = null
      setPage(slug)
      return
    }
    if (artists.length === 0) return
    const artist = artists.find(a => slugify(a.name) === slug)
    if (artist) {
      pendingSlugRef.current = null
      setSelectedArtist(artist)
      setPage('artist')
    } else {
      pendingSlugRef.current = null
    }
  }, [artists])

  useEffect(() => {
    supabase.from('profiles').select('*').eq('is_admin', true).limit(1).single()
      .then(({ data }) => {
        setAdminProfile(data || null)
        setCompareProfile(data || null) // default compare to admin
      })
    supabase.from('profiles').select('*').order('username')
      .then(({ data }) => setAllProfiles(data || []))
  }, [])

  const loadStats = useCallback(async () => {
    if (!user || !adminProfile) return

    try {
      const NON = ['singles', 'features', 'b-sides', 'eps', 'live', 'demos', 'rarities', 'extras', 'other']
      const isNonAlbum = (name) => NON.includes(name.toLowerCase().trim())

      const [albumsRes, songsRes, artistsRes, adminRatingsRes] = await Promise.all([
        supabase.from('albums').select('id, name, artist_id').limit(1000000),
        supabase.from('songs').select('id, name, album_id, excluded').limit(1000000),
        supabase.from('artists').select('id').limit(1000000),
        supabase.from('ratings').select('song_id').eq('user_id', adminProfile.id).limit(1000000),
      ])

      const allAlbums = albumsRes.data || []
      const allSongs = songsRes.data || []
      const totalArtists = (artistsRes.data || []).length
      const adminRatedIds = new Set((adminRatingsRes.data || []).map(r => r.song_id))

      const filteredAlbums = allAlbums.filter(a => !isNonAlbum(a.name))
      const totalAlbums = filteredAlbums.length
      const filteredAlbumIds = new Set(filteredAlbums.map(a => a.id))

      // allAlbumToArtist covers every album for song dedup (matches artist page which counts
      // songs across all albums including singles/features/etc.)
      const allAlbumToArtist = {}
      allAlbums.forEach(a => { allAlbumToArtist[a.id] = a.artist_id })

      // albumToArtist covers only filtered albums for album completion tracking
      const albumToArtist = {}
      filteredAlbums.forEach(a => { albumToArtist[a.id] = a.artist_id })

      // Deduplicate songs by name per artist (matching what the artist page displays),
      // preferring the song ID that has a rating
      const buildSongMap = (ratedIds) => {
        const map = {}
        allSongs.forEach(s => {
          if (s.excluded) return
          const artistId = allAlbumToArtist[s.album_id]
          if (!artistId) return
          if (!map[artistId]) map[artistId] = {}
          const key = s.name.toLowerCase().trim()
          const existing = map[artistId][key]
          if (!existing || (!ratedIds.has(existing) && ratedIds.has(s.id))) {
            map[artistId][key] = s.id
          }
        })
        return map
      }

      const adminSongMap = buildSongMap(adminRatedIds)
      const uniqueAdminSongIds = Object.values(adminSongMap).flatMap(m => Object.values(m))
      const totalSongs = new Set(uniqueAdminSongIds).size

      const calcCompletions = (songMap, ratedIds) => {
        const uniqueSongIds = [...new Set(Object.values(songMap).flatMap(m => Object.values(m)))]
        const ratedSongs = uniqueSongIds.filter(id => ratedIds.has(id)).length

        const albumSongs = {}
        allSongs.forEach(s => {
          if (s.excluded || !filteredAlbumIds.has(s.album_id)) return
          const artistId = albumToArtist[s.album_id]
          if (!artistId) return
          const key = s.name.toLowerCase().trim()
          if (songMap[artistId]?.[key] === s.id) {
            if (!albumSongs[s.album_id]) albumSongs[s.album_id] = []
            albumSongs[s.album_id].push(s.id)
          }
        })

        const completedAlbums = filteredAlbums.filter(a => {
          const ids = albumSongs[a.id] || []
          return ids.length > 0 && ids.every(id => ratedIds.has(id))
        }).length

        const completedArtists = Object.values(songMap).filter(nameMap => {
          const ids = Object.values(nameMap)
          return ids.length > 0 && ids.every(id => ratedIds.has(id))
        }).length

        return { ratedSongs, completedAlbums, completedArtists }
      }

      const adminStats = calcCompletions(adminSongMap, adminRatedIds)

      let userStats = null
      if (user.id !== adminProfile.id) {
        const { data: userRatingsData } = await supabase.from('ratings').select('song_id').eq('user_id', user.id).limit(1000000)
        const userRatedIds = new Set((userRatingsData || []).map(r => r.song_id))
        const userSongMap = buildSongMap(userRatedIds)
        userStats = calcCompletions(userSongMap, userRatedIds)
      }

      setStats({ totalArtists, totalAlbums, totalSongs, admin: adminStats, user: userStats })
    } catch (err) {
      console.error('loadStats error:', err)
    }
  }, [user, adminProfile])

  useEffect(() => {
    if (user && adminProfile) loadStats()
  }, [user, adminProfile, loadStats])

  const loadArtistScores = useCallback(async (myUserId, compareUserId) => {
    if (!myUserId) return

    try {
      // Ensure we have a valid session before querying
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const NON = ['singles', 'features', 'b-sides', 'eps', 'live', 'demos', 'rarities', 'extras', 'other']
      const isNonAlbum = (name) => NON.some(label => name.toLowerCase().trim().includes(label))

      // Fetch albums, songs, and ratings separately
      const { data: allAlbums } = await supabase.from('albums').select('id, name, artist_id').limit(1000000)
      const { data: allSongs } = await supabase.from('songs').select('id, name, album_id, excluded').limit(1000000)
      const { data: myRatingsData } = await supabase.from('ratings').select('song_id, rating').eq('user_id', myUserId).limit(1000000)

      const myRatingMap = {}
      ;(myRatingsData || []).forEach(r => { myRatingMap[r.song_id] = r.rating })

      // All albums (including non-albums — artist score includes everything)
      const albumToArtist = {}
      allAlbums.forEach(a => { albumToArtist[a.id] = a.artist_id })

      // Compare ratings
      let compareRatingMap = null
      if (compareUserId && compareUserId !== myUserId) {
        const { data: cData } = await supabase.from('ratings').select('song_id, rating').eq('user_id', compareUserId).limit(1000000)
        compareRatingMap = {}
        ;(cData || []).forEach(r => { compareRatingMap[r.song_id] = r.rating })
      }

      // Build artistId -> songName -> [all song IDs with that name]
      // Include ALL albums (Singles etc.) to match spreadsheet behavior
      // Skip excluded songs (marked with 'x' in CSV)
      const artistNameMap = {} // artistId -> songName -> [songIds]
      allSongs.forEach(s => {
        if (s.excluded) return
        const artistId = albumToArtist[s.album_id]
        if (!artistId) return
        if (!artistNameMap[artistId]) artistNameMap[artistId] = {}
        const key = s.name.toLowerCase().trim()
        if (!artistNameMap[artistId][key]) artistNameMap[artistId][key] = []
        artistNameMap[artistId][key].push(s.id)
      })

      const getScore = (nameMap, ratingMap) => {
        const ratings = Object.values(nameMap).map(ids => {
          const ratedId = ids.find(id => ratingMap[id] !== undefined)
          return ratedId !== undefined ? ratingMap[ratedId] : undefined
        }).filter(v => v !== undefined)
        if (!ratings.length) return null
        return ratings.reduce((s, v) => s + v, 0) / ratings.length
      }

      const getTens = (nameMap, ratingMap) => {
        return Object.values(nameMap).filter(ids => {
          const ratedId = ids.find(id => ratingMap[id] !== undefined)
          return ratedId !== undefined && ratingMap[ratedId] === 10
        }).length
      }

      const scores = {}
      Object.entries(artistNameMap).forEach(([artistId, nameMap]) => {
        scores[artistId] = {
          myScore: getScore(nameMap, myRatingMap),
          myTens: getTens(nameMap, myRatingMap),
          compareScore: compareRatingMap ? getScore(nameMap, compareRatingMap) : null,
          compareTens: compareRatingMap ? getTens(nameMap, compareRatingMap) : null,
        }
      })

      setArtistScores(scores)
    } catch (err) {
      console.error('loadArtistScores error:', err)
    }
  }, [])

  useEffect(() => {
    if (!user || artists.length === 0 || adminProfile === undefined) return
    const compareId = compareProfile?.id !== user.id ? compareProfile?.id : null
    // Small delay to let all state settle before firing
    const timer = setTimeout(() => {
      loadArtistScores(user.id, compareId)
    }, 300)
    return () => clearTimeout(timer)
  }, [user, artists, compareProfile, adminProfile, loadArtistScores])

  const loadSiteSettings = useCallback(async () => {
    const { data } = await supabase.from('site_settings').select('*')
    if (data) {
      const map = {}
      data.forEach(row => { map[row.key] = row.value })
      setSiteSettings({ artist_in_review: map.artist_in_review || null, artist_on_deck: map.artist_on_deck || null })
    }
  }, [])

  const saveSiteSettings = async () => {
    await supabase.from('site_settings').upsert([
      { key: 'artist_in_review', value: settingsInReview.trim() || null, updated_at: new Date().toISOString() },
      { key: 'artist_on_deck', value: settingsOnDeck.trim() || null, updated_at: new Date().toISOString() },
    ])
    setSiteSettings({ artist_in_review: settingsInReview.trim() || null, artist_on_deck: settingsOnDeck.trim() || null })
    setShowEditSettings(false)
  }

  useEffect(() => { if (user) loadSiteSettings() }, [user, loadSiteSettings])

  const loadArtists = useCallback(async () => {
    const { data } = await supabase.from('artists').select('*').order('name')
    setArtists(data || [])
  }, [])

  useEffect(() => { if (user) loadArtists() }, [user, loadArtists])

  useEffect(() => {
    if (!user) return
    const d = new Date()
    const month = `${['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()]} ${d.getFullYear()}`
    supabase.from('monthly_picks').select('artist_id').eq('month', month).not('artist_id', 'is', null)
      .then(({ data }) => setNewMusicArtistIds(new Set((data || []).map(p => p.artist_id))))
  }, [user])

  useEffect(() => {
    if (!user) return
    supabase.from('live_shows').select('artist_id, count').eq('user_id', user.id)
      .then(({ data }) => {
        const map = {}
        ;(data || []).forEach(r => { map[r.artist_id] = r.count })
        setLiveShowCounts(map)
      })
  }, [user])

  const updateLiveCount = async (artistId, delta) => {
    const current = liveShowCounts[artistId] || 0
    const next = Math.max(0, current + delta)
    setLiveShowCounts(prev => ({ ...prev, [artistId]: next }))
    let err
    if (next === 0) {
      ;({ error: err } = await supabase.from('live_shows').delete().eq('user_id', user.id).eq('artist_id', artistId))
    } else {
      ;({ error: err } = await supabase.from('live_shows').upsert({ user_id: user.id, artist_id: artistId, count: next }))
    }
    if (err) {
      setLiveShowCounts(prev => ({ ...prev, [artistId]: current }))
      alert('Could not save — make sure the live_shows table exists in Supabase.\n\n' + err.message)
    }
  }

  const loadArtistDetail = useCallback(async (artist) => {
    setDataLoading(true)
    const { data: albums } = await supabase
      .from('albums')
      .select('*, songs(id, name, track_order, excluded)')
      .eq('artist_id', artist.id)
      .order('year', { ascending: true, nullsFirst: false })

    const sorted = (albums || []).map(a => ({
      ...a,
      songs: [...(a.songs || [])].sort((x, y) => x.track_order - y.track_order)
    }))
    setArtistDetail({ albums: sorted })
    // Collapse all albums by default
    const collapsed = {}
    sorted.forEach(a => { collapsed[a.id] = true })
    setCollapsedAlbums(collapsed)

    const songIds = sorted.flatMap(a => a.songs.map(s => s.id))
    if (songIds.length && user) {
      // Batch in chunks of 200 to avoid URL length limits
      const batchSize = 200
      const allRatings = []
      for (let i = 0; i < songIds.length; i += batchSize) {
        const batch = songIds.slice(i, i + batchSize)
        const { data: ur } = await supabase
          .from('ratings').select('song_id, rating')
          .eq('user_id', user.id).in('song_id', batch)
        if (ur) allRatings.push(...ur)
      }
      const map = {}
      const nameMap = {}
      allRatings.forEach(r => { map[r.song_id] = r.rating })
      sorted.flatMap(a => a.songs).forEach(s => {
        if (map[s.id]) nameMap[s.name.toLowerCase().trim()] = map[s.id]
      })
      setUserRatings({ ...map, __nameMap: nameMap })
    }
    setDataLoading(false)
  }, [user])

  // Load compare ratings whenever compareProfile or artistDetail changes
  const loadCompareRatings = useCallback(async (songIds) => {
    if (!compareProfile || !songIds.length) {
      setCompareRatings({})
      return
    }
    if (compareProfile.id === user?.id) {
      setCompareRatings({})
      return
    }
    // Batch in chunks of 200 to avoid URL length limits
    const batchSize = 200
    const allRatings = []
    for (let i = 0; i < songIds.length; i += batchSize) {
      const batch = songIds.slice(i, i + batchSize)
      const { data: cr } = await supabase
        .from('ratings').select('song_id, rating')
        .eq('user_id', compareProfile.id).in('song_id', batch)
      if (cr) allRatings.push(...cr)
    }
    const cmap = {}
    allRatings.forEach(r => { cmap[r.song_id] = r.rating })
    if (artistDetail) {
      artistDetail.albums.flatMap(a => a.songs).forEach(s => {
        if (cmap[s.id]) cmap.__nameMap = { ...(cmap.__nameMap || {}), [s.name.toLowerCase().trim()]: cmap[s.id] }
      })
    }
    setCompareRatings(cmap)
  }, [compareProfile, user])

  useEffect(() => {
    if (!artistDetail) return
    const songIds = artistDetail.albums.flatMap(a => a.songs.map(s => s.id))
    loadCompareRatings(songIds)
  }, [artistDetail, loadCompareRatings])

  useEffect(() => {
    if (selectedArtist && adminProfile !== undefined) loadArtistDetail(selectedArtist)
    setArtistTab('albums')
  }, [selectedArtist, loadArtistDetail])

  useEffect(() => {
    if (!selectedArtist) { setNewPickTitles({ songs: new Set(), albums: new Set() }); return }
    const d = new Date()
    const month = `${['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()]} ${d.getFullYear()}`
    supabase.from('monthly_picks').select('type, title').eq('artist_id', selectedArtist.id).eq('month', month)
      .then(({ data }) => {
        const songs = new Set((data || []).filter(p => p.type === 'single').map(p => p.title.toLowerCase().trim()))
        const albums = new Set((data || []).filter(p => p.type === 'album').map(p => p.title.toLowerCase().trim()))
        setNewPickTitles({ songs, albums })
      })
  }, [selectedArtist])

  const rate = async (songId, rating) => {
    // Find all songs with the same name across all albums for this artist
    const ratedSong = artistDetail?.albums.flatMap(a => a.songs).find(s => s.id === songId)
    const nameKey = ratedSong?.name?.toLowerCase().trim()
    const allMatchingIds = nameKey
      ? artistDetail.albums.flatMap(a => a.songs)
          .filter(s => s.name.toLowerCase().trim() === nameKey)
          .map(s => s.id)
      : [songId]

    // Update local state for all matching IDs
    setUserRatings(prev => {
      const updated = { ...prev }
      allMatchingIds.forEach(id => { updated[id] = rating })
      if (nameKey) updated.__nameMap = { ...(prev.__nameMap || {}), [nameKey]: rating }
      return updated
    })

    // Save to database for all matching song IDs
    await Promise.all(allMatchingIds.map(id =>
      supabase.rpc('upsert_rating', { p_song_id: id, p_rating: rating })
    ))
  }

  const addSong = async () => {
    if (!newSongName.trim() || !editingAlbum) return
    const songs = editingAlbum.songs
    // Determine insert position
    const insertAt = insertAfterIdx === null ? songs.length : insertAfterIdx === -1 ? 0 : insertAfterIdx + 1

    // Insert song into DB
    const { data: s } = await supabase
      .from('songs')
      .insert({ album_id: editingAlbum.id, name: newSongName.trim(), track_order: insertAt })
      .select().single()

    if (s) {
      // Re-order songs after insertion
      const newSongs = [
        ...songs.slice(0, insertAt),
        s,
        ...songs.slice(insertAt),
      ]
      // Update track_order for all songs after the insert point
      await Promise.all(
        newSongs.map((song, idx) =>
          supabase.from('songs').update({ track_order: idx }).eq('id', song.id)
        )
      )
      const updatedSongs = newSongs.map((song, idx) => ({ ...song, track_order: idx }))
      setArtistDetail(prev => ({
        ...prev,
        albums: prev.albums.map(a => a.id === editingAlbum.id ? { ...a, songs: updatedSongs } : a)
      }))
      setEditingAlbum(prev => ({ ...prev, songs: updatedSongs }))
      setNewSongName('')
      setInsertAfterIdx(null)
    }
  }

  const renameSong = async (songId) => {
    if (!editingSongName.trim()) return
    await supabase.from('songs').update({ name: editingSongName.trim() }).eq('id', songId)
    const updateSongs = (songs) => songs.map(s => s.id === songId ? { ...s, name: editingSongName.trim() } : s)
    setArtistDetail(prev => ({
      ...prev,
      albums: prev.albums.map(a => a.id === editingAlbum.id ? { ...a, songs: updateSongs(a.songs) } : a)
    }))
    setEditingAlbum(prev => ({ ...prev, songs: updateSongs(prev.songs) }))
    setEditingSongId(null)
    setEditingSongName('')
  }

  const deleteSong = async (songId, songName) => {
    if (!confirm(`Delete "${songName}"? This will also delete all ratings for this song.`)) return
    await supabase.from('songs').delete().eq('id', songId)
    setArtistDetail(prev => ({
      ...prev,
      albums: prev.albums.map(a => a.id === editingAlbum.id
        ? { ...a, songs: a.songs.filter(s => s.id !== songId) }
        : a
      )
    }))
    setEditingAlbum(prev => ({ ...prev, songs: prev.songs.filter(s => s.id !== songId) }))
  }

  const toggleSongInterlude = async (songId, currentExcluded) => {
    const newExcluded = !currentExcluded
    await supabase.from('songs').update({ excluded: newExcluded }).eq('id', songId)
    const updateSongs = (songs) => songs.map(s => s.id === songId ? { ...s, excluded: newExcluded } : s)
    setArtistDetail(prev => ({
      ...prev,
      albums: prev.albums.map(a => a.id === editingAlbum.id ? { ...a, songs: updateSongs(a.songs) } : a)
    }))
    setEditingAlbum(prev => ({ ...prev, songs: updateSongs(prev.songs) }))
  }

  const albumAvg = (songs, ratingMap) => {
    const vals = songs.filter(s => !s.excluded).map(s => {
      const nameKey = s.name.toLowerCase().trim()
      return ratingMap[s.id] || ratingMap.__nameMap?.[nameKey] || 0
    }).filter(v => v > 0)
    if (!vals.length) return null
    return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)
  }

  const saveArtistEdit = async () => {
    const updates = {
      genre: editGenre || null,
      subgenre: editSubgenre || null,
      image_url: editImageUrl || null,
      debut_year: editDebutYear || null,
      country: editCountry || null,
    }
    await supabase.from('artists').update(updates).eq('id', selectedArtist.id)
    const updated = { ...selectedArtist, ...updates }
    setSelectedArtist(updated)
    setArtists(prev => prev.map(a => a.id === selectedArtist.id ? updated : a))
    setShowEditArtist(false)
  }

  const deleteArtist = async () => {
    if (!confirm(`Permanently delete "${selectedArtist.name}"? This will remove all their albums, songs, and ratings.`)) return
    await supabase.from('artists').delete().eq('id', selectedArtist.id)
    setShowEditArtist(false)
    setPage('home')
    setSelectedArtist(null)
    setArtistDetail(null)
    loadArtists()
  }

  const openEditAlbum = (album) => {
    setEditingAlbum(album)
    setEditAlbumName(album.name)
    setEditAlbumYear(album.year || '')
    setEditAlbumGenre(album.genre || '')
    setEditAlbumSubgenre(album.subgenre || '')
    setEditAlbumImageUrl(album.image_url || '')
    setShowEditAlbum(true)
  }

  const saveAlbumEdit = async () => {
    const updates = {
      name: editAlbumName.trim() || editingAlbum.name,
      year: editAlbumYear.trim() || null,
      genre: editAlbumGenre.trim() || null,
      subgenre: editAlbumSubgenre.trim() || null,
      image_url: editAlbumImageUrl || null,
    }
    await supabase.from('albums').update(updates).eq('id', editingAlbum.id)
    setShowEditAlbum(false)
    setEditingAlbum(null)
    loadArtistDetail(selectedArtist)
  }

  const deleteAlbum = async (albumId, albumName) => {
    if (!confirm(`Delete "${albumName}"? This removes all ratings too.`)) return
    await supabase.from('albums').delete().eq('id', albumId)
    loadArtistDetail(selectedArtist)
  }

  const addAlbum = async () => {
    if (!newAlbumName.trim() || !newSongs.trim()) return
    const { data: alb } = await supabase
      .from('albums')
      .insert({ artist_id: selectedArtist.id, name: newAlbumName.trim(), year: newAlbumYear.trim() || null, image_url: newAlbumImageUrl || null })
      .select().single()
    if (!alb) return
    const songs = newSongs.split('\n').filter(s => s.trim()).map((s, i) => ({ album_id: alb.id, name: s.trim(), track_order: i }))
    await supabase.from('songs').insert(songs)
    setNewAlbumName(''); setNewAlbumYear(''); setNewSongs(''); setNewAlbumImageUrl('')
    setShowAddAlbum(false)
    loadArtistDetail(selectedArtist)
  }

  const genreStats = artists.reduce((acc, a) => {
    if (a.genre) acc[a.genre] = (acc[a.genre] || 0) + 1
    return acc
  }, {})

  const NON_ALBUM_LABELS = ['singles', 'features', 'b-sides', 'eps', 'live', 'demos', 'rarities', 'extras', 'other']
  const albumCount = (albums) => (albums || []).filter(a => !NON_ALBUM_LABELS.includes(a.name.toLowerCase().trim())).length

  const filtered = (() => {
    const q = search.toLowerCase()
    let list = artists.filter(a =>
      (!q || a.name.toLowerCase().includes(q) ||
        (a.genre || '').toLowerCase().includes(q) ||
        (a.subgenre || '').toLowerCase().includes(q)) &&
      (!filters.genre || a.genre === filters.genre) &&
      (!filters.subgenre || a.subgenre === filters.subgenre) &&
      (!filters.country || a.country?.toUpperCase() === filters.country) &&
      (!filters.decade || getDecade(a.debut_year) === filters.decade) &&
      (!filters.minScore || (artistScores[a.id]?.myScore || 0) >= parseFloat(filters.minScore)) &&
      (!filters.seenLive || (liveShowCounts[a.id] || 0) > 0) &&
      (!filters.newMusic || newMusicArtistIds.has(a.id))
    )
    return list.sort((a, b) => {
      switch (filters.sortBy) {
        case 'za': return b.name.localeCompare(a.name)
        case 'score_desc': return (artistScores[b.id]?.myScore || 0) - (artistScores[a.id]?.myScore || 0)
        case 'score_asc': return (artistScores[a.id]?.myScore || 0) - (artistScores[b.id]?.myScore || 0)
        case 'tens_desc': return (artistScores[b.id]?.myTens || 0) - (artistScores[a.id]?.myTens || 0)
        case 'live_desc': return (liveShowCounts[b.id] || 0) - (liveShowCounts[a.id] || 0)
        case 'year_asc': return (parseInt(a.debut_year) || 9999) - (parseInt(b.debut_year) || 9999)
        case 'year_desc': return (parseInt(b.debut_year) || 0) - (parseInt(a.debut_year) || 0)
        default: return a.name.localeCompare(b.name)
      }
    })
  })()

  if (window.location.pathname === '/reset-password') {
    return <ResetPassword />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Music className="w-10 h-10 text-violet-500 animate-pulse" />
      </div>
    )
  }

  if (!user) return <Login onSignIn={signIn} onSignUp={signUp} onResetPassword={resetPassword} />

  return (
    <div className="min-h-screen bg-[#080808]">
      <nav className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur border-b border-zinc-800/60">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Music className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight hidden sm:block">Music Ratings</span>
          </div>
          <div className="flex items-center gap-2">
            {page !== 'home' && (
              <button onClick={() => { setPage('home'); setSelectedArtist(null); setArtistDetail(null) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-400 hover:text-white text-sm transition-colors">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </button>
            )}
            <button onClick={() => setPage('monthly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${page === 'monthly' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">New Music</span>
            </button>
            <button onClick={() => setPage('requests')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${page === 'requests' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Requests</span>
            </button>
            <button onClick={() => setPage('topten')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${page === 'topten' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Top 10</span>
            </button>
            <button onClick={() => setPage('stats')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${page === 'stats' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
              <BarChart2 className="w-4 h-4" />
              <span className="hidden sm:inline">Stats</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg">
              <span className="text-sm text-zinc-300 font-medium">{profile?.username}</span>
              {isAdmin && <span className="text-xs bg-violet-600 text-white px-1.5 py-0.5 rounded font-medium">Admin</span>}
            </div>
            <button onClick={signOut} className="p-1.5 text-zinc-500 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* HOME */}
        {page === 'home' && (
          <div className="space-y-8">
            {/* Hero */}
            <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.18),transparent_60%)] pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.1),transparent_60%)] pointer-events-none" />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">Collection</h1>
                  <p className="text-zinc-400 text-sm mt-2 max-w-md">Browse the collection, explore albums, and see how artists stack up against each other.</p>
                  <p className="text-zinc-600 text-xs mt-2">All data sourced from Spotify · No live albums · {artists.length} artists</p>
                </div>
                {isAdmin && (
                  <button onClick={() => setShowImport(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors">
                    <Upload className="w-4 h-4" />Import CSV
                  </button>
                )}
              </div>
            </div>

            {/* Currently in review / on deck banner */}
            {(siteSettings.artist_in_review || siteSettings.artist_on_deck || isAdmin) && (
              <div className="bg-gradient-to-r from-violet-900/30 to-indigo-900/20 border border-violet-800/30 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 flex-1">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Currently In Review</p>
                      <p className="text-white font-semibold text-lg">
                        {siteSettings.artist_in_review || <span className="text-zinc-600 font-normal text-base">Not set</span>}
                      </p>
                    </div>
                    <div className="w-px bg-zinc-700/50 hidden sm:block" />
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">On Deck</p>
                      <p className="text-white font-semibold text-lg">
                        {siteSettings.artist_on_deck || <span className="text-zinc-600 font-normal text-base">Not set</span>}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSettingsInReview(siteSettings.artist_in_review || '')
                        setSettingsOnDeck(siteSettings.artist_on_deck || '')
                        setShowEditSettings(true)
                      }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors flex-shrink-0"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Stats panel */}
            {stats && (
              <div className="bg-gradient-to-br from-violet-950/20 to-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Collection Stats</span>
                </div>

                {/* Stat rows */}
                {[
                  { label: 'Artists', total: stats.totalArtists, adminVal: stats.admin.completedArtists, userVal: stats.user?.completedArtists },
                  { label: 'Albums & EPs', total: stats.totalAlbums, adminVal: stats.admin.completedAlbums, userVal: stats.user?.completedAlbums },
                  { label: 'Songs', total: stats.totalSongs, adminVal: stats.admin.ratedSongs, userVal: stats.user?.ratedSongs },
                ].map(({ label, total, adminVal, userVal }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-zinc-400">{label}</span>
                      <div className="flex items-center gap-3 text-xs">
                        {userVal !== undefined && userVal !== null && (
                          <span className="text-indigo-400 font-medium">
                            {profile?.username} {userVal}<span className="text-zinc-600">/{adminVal}</span>
                          </span>
                        )}
                        <span className="text-violet-400 font-medium">
                          {adminProfile?.username} {adminVal}<span className="text-zinc-600">/{total}</span>
                        </span>
                      </div>
                    </div>
                    {/* Admin bar */}
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-600 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (adminVal / Math.max(1, total)) * 100)}%` }} />
                    </div>
                    {/* User bar */}
                    {userVal !== undefined && userVal !== null && (
                      <div className="h-1.5 bg-zinc-800/50 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (userVal / Math.max(1, adminVal)) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                ))}

                {/* Legend */}
                {stats.user && (
                  <div className="flex gap-4 pt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-2 bg-violet-600 rounded-sm" />
                      <span className="text-xs text-zinc-500">{adminProfile?.username}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-1.5 bg-indigo-500 rounded-sm" />
                      <span className="text-xs text-zinc-500">{profile?.username} (of {adminProfile?.username}'s)</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <HomeFilters
              artists={artists}
              artistScores={artistScores}
              liveShowCounts={liveShowCounts}
              newMusicArtistIds={newMusicArtistIds}
              filters={filters}
              setFilters={setFilters}
              search={search}
              setSearch={setSearch}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(() => {
                const newestId = artists.reduce((best, a) =>
                  !best || a.created_at > best.created_at ? a : best, null)?.id
                return filtered.map(artist => {
                const scores = artistScores[artist.id]
                const myScore = scores?.myScore
                const compareScore = scores?.compareScore
                const compareLabel = compareProfile?.username || adminProfile?.username

                return (
                  <button key={artist.id}
                    onClick={() => { setSelectedArtist(artist); setPage('artist') }}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left transition-all duration-200 group hover:shadow-xl hover:shadow-black/50 hover:-translate-y-px"
                    style={myScore ? { borderLeftColor: scoreColor(myScore), borderLeftWidth: '3px' } : {}}>
                    <div className="flex items-center gap-4">
                      {artist.image_url ? (
                        <img src={artist.image_url} alt={artist.name}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-zinc-700 group-hover:border-zinc-500 transition-colors" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                          <Music className="w-7 h-7 text-violet-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold text-white group-hover:text-violet-300 transition-colors truncate">{artist.name}</div>
                          {artist.id === newestId && (
                            <span className="flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30">✦ New</span>
                          )}
                          {newMusicArtistIds.has(artist.id) && (
                            <span className="flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">New Music</span>
                          )}
                          {(liveShowCounts[artist.id] || 0) > 0 && (
                            <span className="flex-shrink-0 flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <Ticket className="w-3 h-3" />{liveShowCounts[artist.id]}
                            </span>
                          )}
                        </div>
                        {artist.genre && (
                          <div className="text-xs text-zinc-500 truncate mt-0.5">
                            {artist.genre}{artist.subgenre ? ` · ${artist.subgenre}` : ''}
                          </div>
                        )}
                        {artist.debut_year && (
                          <div className="text-xs text-zinc-600 mt-0.5">Est. {artist.debut_year}</div>
                        )}
                        {artist.country && (
                          <div className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1">
                            {getFlagUrl(artist.country) && (
                              <img src={getFlagUrl(artist.country)} alt={artist.country}
                                className="w-4 h-3 object-cover rounded-sm border border-zinc-800" />
                            )}
                            <span>{getCountryName(artist.country)}</span>
                          </div>
                        )}
                        {/* Scores */}
                        {(myScore || compareScore) && (
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {myScore && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold px-2 py-0.5 rounded"
                                  style={{ backgroundColor: scoreColor(myScore) + '33', color: scoreColor(myScore), border: `1px solid ${scoreColor(myScore)}55` }}>
                                  {profile?.username} {myScore.toFixed(2)}
                                </span>
                                {scores?.myTens > 0 && (
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                    profile?.is_admin
                                      ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                                      : 'text-indigo-400 bg-indigo-400/10 border border-indigo-400/20'
                                  }`}>
                                    ★×{scores.myTens}
                                  </span>
                                )}
                              </div>
                            )}
                            {compareScore && compareProfile?.id !== user?.id && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold px-2 py-0.5 rounded"
                                  style={{ backgroundColor: scoreColor(compareScore) + '22', color: scoreColor(compareScore), border: `1px solid ${scoreColor(compareScore)}44` }}>
                                  {compareLabel} {compareScore.toFixed(2)}
                                </span>
                                {scores?.compareTens > 0 && (
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                    compareProfile?.is_admin
                                      ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                                      : 'text-indigo-400 bg-indigo-400/10 border border-indigo-400/20'
                                  }`}>
                                    ★×{scores.compareTens}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
              })()}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20 text-zinc-600">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{artists.length === 0 ? 'No artists yet. Import your collection.' : 'No results found.'}</p>
              </div>
            )}
          </div>
        )}

        {/* ARTIST PAGE */}
        {page === 'artist' && selectedArtist && (
          <div className="space-y-6">
            <button onClick={() => { setPage('home'); setSelectedArtist(null); setArtistDetail(null) }}
              className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm">
              <ChevronLeft className="w-4 h-4" />All Artists
            </button>

            <div className="bg-gradient-to-br from-violet-900/40 to-indigo-900/20 border border-violet-800/30 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-5">
                  {selectedArtist.image_url ? (
                    <img src={selectedArtist.image_url} alt={selectedArtist.name}
                      className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl object-cover border border-violet-500/30 flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                      <Music className="w-8 h-8 sm:w-12 sm:h-12 text-violet-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-4xl font-bold text-white truncate">{selectedArtist.name}</h1>
                    {(selectedArtist.genre || selectedArtist.subgenre) && (
                      <p className="text-violet-300 mt-1 text-sm sm:text-base">{[selectedArtist.genre, selectedArtist.subgenre].filter(Boolean).join(' · ')}</p>
                    )}
                    {selectedArtist.debut_year && (
                      <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">Est. {selectedArtist.debut_year}</p>
                    )}
                    {selectedArtist.country && (
                      <p className="text-zinc-400 text-xs sm:text-sm mt-0.5 flex items-center gap-1.5">
                        {getFlagUrl(selectedArtist.country) && (
                          <img
                            src={getFlagUrl(selectedArtist.country)}
                            alt={selectedArtist.country}
                            className="w-6 h-4 object-cover rounded-sm border border-zinc-700"
                          />
                        )}
                        {getCountryName(selectedArtist.country)}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs sm:text-sm text-zinc-500">
                      <span className="flex items-center gap-1"><Disc className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{albumCount(artistDetail?.albums)} albums & EPs</span>
                      <span className="flex items-center gap-1"><ListMusic className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{
                        new Set(artistDetail?.albums.flatMap(a => a.songs.filter(s => !s.excluded).map(s => s.name.toLowerCase().trim()))).size || 0
                      } songs</span>
                    </div>
                    {/* Live shows counter */}
                    <div className="flex items-center gap-2 mt-2">
                      <Ticket className="w-3.5 h-3.5 text-zinc-500" />
                      {(liveShowCounts[selectedArtist.id] || 0) === 0 ? (
                        <span className="text-xs text-zinc-600">Never seen live</span>
                      ) : (
                        <span className="text-xs text-zinc-400">
                          Seen live <span className="text-white font-semibold">{liveShowCounts[selectedArtist.id]}</span> {liveShowCounts[selectedArtist.id] === 1 ? 'time' : 'times'}
                        </span>
                      )}
                      <div className="flex items-center gap-1 ml-1">
                        <button onClick={() => updateLiveCount(selectedArtist.id, -1)}
                          disabled={(liveShowCounts[selectedArtist.id] || 0) === 0}
                          className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          <Minus className="w-3 h-3" />
                        </button>
                        <button onClick={() => updateLiveCount(selectedArtist.id, 1)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {/* Artist scores */}
                    {artistScores[selectedArtist.id] && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {artistScores[selectedArtist.id].myScore && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                              style={{ backgroundColor: scoreColor(artistScores[selectedArtist.id].myScore) + '33', color: scoreColor(artistScores[selectedArtist.id].myScore), border: `1px solid ${scoreColor(artistScores[selectedArtist.id].myScore)}55` }}>
                              {profile?.username}: {artistScores[selectedArtist.id].myScore.toFixed(2)}
                            </span>
                            {artistScores[selectedArtist.id].myTens > 0 && (
                              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                profile?.is_admin
                                  ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                                  : 'text-indigo-400 bg-indigo-400/10 border border-indigo-400/20'
                              }`}>
                                ★ {artistScores[selectedArtist.id].myTens} tens
                              </span>
                            )}
                          </div>
                        )}
                        {artistScores[selectedArtist.id].compareScore && compareProfile?.id !== user?.id && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                              style={{ backgroundColor: scoreColor(artistScores[selectedArtist.id].compareScore) + '22', color: scoreColor(artistScores[selectedArtist.id].compareScore), border: `1px solid ${scoreColor(artistScores[selectedArtist.id].compareScore)}44` }}>
                              {compareProfile?.username || adminProfile?.username}: {artistScores[selectedArtist.id].compareScore.toFixed(2)}
                            </span>
                            {artistScores[selectedArtist.id].compareTens > 0 && (
                              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                compareProfile?.is_admin
                                  ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                                  : 'text-indigo-400 bg-indigo-400/10 border border-indigo-400/20'
                              }`}>
                                ★ {artistScores[selectedArtist.id].compareTens} tens
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => {
                    setEditGenre(selectedArtist.genre || '')
                    setEditSubgenre(selectedArtist.subgenre || '')
                    setEditImageUrl(selectedArtist.image_url || '')
                    setEditDebutYear(selectedArtist.debut_year || '')
                    setEditCountry(selectedArtist.country || '')
                    setShowEditArtist(true)
                  }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-xl transition-colors self-start sm:flex-shrink-0">
                    Edit Info
                  </button>
                )}
              </div>
            </div>

            {artistDetail && (
              <AlbumChart albums={artistDetail.albums} userRatings={userRatings} adminRatings={compareRatings} isAdmin={compareProfile?.id === user?.id} adminName={compareProfile?.username} />
            )}

            {/* Compare user selector */}
            {allProfiles.filter(p => p.id !== user?.id).length > 0 && (
              <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                <span className="text-xs text-zinc-500 uppercase tracking-widest flex-shrink-0">Compare with</span>
                <select
                  value={compareProfile?.id || ''}
                  onChange={e => {
                    const p = allProfiles.find(p => p.id === e.target.value) || null
                    setCompareProfile(p)
                  }}
                  className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Nobody</option>
                  {allProfiles
                    .filter(p => p.id !== user?.id)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.username}{p.is_admin ? ' (Admin)' : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Tabs */}
            {artistDetail && (() => {
              const seenNames = new Set()
              const tens = artistDetail.albums.flatMap(album =>
                album.songs.filter(s => !s.excluded && (userRatings[s.id] || userRatings.__nameMap?.[s.name.toLowerCase().trim()]) === 10)
                  .map(s => ({ ...s, albumName: album.name, albumYear: album.year, albumImage: album.image_url }))
              ).filter(s => {
                const key = s.name.toLowerCase().trim()
                if (seenNames.has(key)) return false
                seenNames.add(key)
                return true
              })
              return (
                <div className="flex items-center gap-1 border-b border-zinc-800 -mb-1">
                  <button
                    onClick={() => setArtistTab('albums')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${artistTab === 'albums' ? 'border-violet-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Albums
                  </button>
                  <button
                    onClick={() => setArtistTab('tens')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${artistTab === 'tens' ? 'border-violet-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Tens
                    {tens.length > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${artistTab === 'tens' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{tens.length}</span>
                    )}
                  </button>
                </div>
              )
            })()}

            {/* Tens tab content */}
            {artistTab === 'tens' && artistDetail && (() => {
              const seenNames = new Set()
              const tens = artistDetail.albums.flatMap(album =>
                album.songs.filter(s => !s.excluded && (userRatings[s.id] || userRatings.__nameMap?.[s.name.toLowerCase().trim()]) === 10)
                  .map(s => ({ ...s, albumName: album.name, albumYear: album.year, albumImage: album.image_url }))
              ).filter(s => {
                const key = s.name.toLowerCase().trim()
                if (seenNames.has(key)) return false
                seenNames.add(key)
                return true
              })
              if (!tens.length) return (
                <div className="text-center py-16 text-zinc-600 text-sm">No 10-rated songs yet</div>
              )
              return (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="divide-y divide-zinc-800/60">
                    {tens.map(song => (
                      <div key={song.id} className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-800/30 transition-colors">
                        {song.albumImage ? (
                          <img src={song.albumImage} alt={song.albumName} className="w-9 h-9 rounded-lg object-cover border border-zinc-700 flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">{song.name}</div>
                          <div className="text-xs text-zinc-500 truncate">{song.albumName}{song.albumYear ? ` · ${song.albumYear}` : ''}</div>
                        </div>
                        <span className="text-amber-400 font-bold text-sm flex-shrink-0">10</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Album controls */}
            {artistTab === 'albums' && artistDetail && artistDetail.albums.length > 0 && (
              <div className="flex items-center justify-between">
                {isAdmin && (
                  <button onClick={() => setShowAddAlbum(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors">
                    <Plus className="w-4 h-4" />Add Album
                  </button>
                )}
                {!isAdmin && <div />}
                <div className="flex items-center gap-2">
                  <button onClick={expandAll}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                    Expand All
                  </button>
                  <button onClick={collapseAll}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                    Collapse All
                  </button>
                </div>
              </div>
            )}

            {artistTab === 'albums' && !artistDetail?.albums.length && isAdmin && (
              <div className="flex justify-end">
                <button onClick={() => setShowAddAlbum(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors">
                  <Plus className="w-4 h-4" />Add Album
                </button>
              </div>
            )}

            {artistTab === 'albums' && (dataLoading ? (
              <div className="text-center py-12 text-zinc-600">Loading...</div>
            ) : (
              <div className="space-y-3">
                {artistDetail?.albums.map(album => {
                  const uAvg = albumAvg(album.songs, userRatings)
                  const aAvg = compareProfile?.id !== user?.id ? albumAvg(album.songs, compareRatings) : null
                  const isCollapsed = !!collapsedAlbums[album.id]

                  return (
                    <div key={album.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-zinc-800/70 to-zinc-900/40 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 border-b border-zinc-800 cursor-pointer hover:from-zinc-800 hover:to-zinc-800/60 transition-all select-none"
                        onClick={() => toggleAlbum(album.id)}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          {album.image_url ? (
                            <img src={album.image_url} alt={album.name}
                              className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl object-cover border border-zinc-700 flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-zinc-700/50 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                              <Disc className="w-4 h-4 sm:w-6 sm:h-6 text-zinc-500" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-white text-sm sm:text-base">{album.name}</h3>
                              {newPickTitles.albums.has(album.name.toLowerCase().trim()) && (
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">New</span>
                              )}
                              {uAvg && (
                                <span className="px-2 py-0.5 text-xs font-bold rounded-full"
                                  style={{ backgroundColor: scoreColor(parseFloat(uAvg)) + '33', color: scoreColor(parseFloat(uAvg)), border: `1px solid ${scoreColor(parseFloat(uAvg))}55` }}>
                                  {uAvg}
                                </span>
                              )}
                              {aAvg && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full"
                                  style={{ backgroundColor: scoreColor(parseFloat(aAvg)) + '22', color: scoreColor(parseFloat(aAvg)), border: `1px solid ${scoreColor(parseFloat(aAvg))}44` }}>
                                  {compareProfile?.username || 'Admin'} {aAvg}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">{album.year ? `${album.year} · ` : ''}{album.songs.length} tracks</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isAdmin && (
                            <>
                              <button
                                onClick={e => { e.stopPropagation(); openEditAlbum(album) }}
                                className="p-1.5 sm:p-2 text-zinc-500 hover:text-violet-400 hover:bg-violet-950/30 rounded-lg transition-colors" title="Edit album">
                                <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); deleteAlbum(album.id, album.name) }}
                                className="p-1.5 sm:p-2 text-zinc-600 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors" title="Delete album">
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </>
                          )}
                          <div className="p-1.5 sm:p-2 text-zinc-500">
                            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Songs — hidden when collapsed */}
                      {!isCollapsed && (
                        <div className="divide-y divide-zinc-800/60">
                          {album.songs.map((song, idx) => {
                            const nameKey = song.name.toLowerCase().trim()
                            const uRating = userRatings[song.id] || userRatings.__nameMap?.[nameKey] || 0
                            const aRating = compareProfile?.id !== user?.id ? (compareRatings[song.id] || compareRatings.__nameMap?.[nameKey] || 0) : 0
                            const isExcluded = song.excluded
                            return (
                              <div key={song.id} className={`px-4 sm:px-6 py-3 hover:bg-zinc-800/30 transition-colors ${isExcluded ? 'opacity-40' : ''}`}>
                                <div className="flex items-start gap-3">
                                  <span className="text-zinc-600 font-mono text-xs w-5 text-right flex-shrink-0 mt-1">{idx + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-zinc-200 text-sm truncate">{song.name}</span>
                                      {!isExcluded && newPickTitles.songs.has(song.name.toLowerCase().trim()) && (
                                        <span className="flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">New</span>
                                      )}
                                    </div>
                                    {isExcluded && <span className="text-xs text-zinc-500 italic">Interlude</span>}
                                    {!isExcluded && (
                                      <div className="flex items-center gap-3 mt-1.5 sm:hidden">
                                        {aRating > 0 && (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-zinc-600">{compareProfile?.username || 'Admin'}:</span>
                                            <StarRating rating={aRating} readonly size="sm" />
                                          </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                          {aRating > 0 && <span className="text-xs text-zinc-600">You:</span>}
                                          <StarRating rating={uRating} onRate={r => rate(song.id, r)} size="sm" />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {!isExcluded && (
                                    <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                                      {aRating > 0 && (
                                        <div className="flex flex-col items-end">
                                          <span className="text-xs text-zinc-600 mb-1">{compareProfile?.username || 'Admin'}</span>
                                          <StarRating rating={aRating} readonly size="sm" />
                                        </div>
                                      )}
                                      <div className="flex flex-col items-end">
                                        {aRating > 0 && <span className="text-xs text-zinc-600 mb-1">You</span>}
                                        <StarRating rating={uRating} onRate={r => rate(song.id, r)} size="sm" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}

                {artistDetail?.albums.length === 0 && (
                  <div className="text-center py-16 text-zinc-600">
                    <Disc className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No albums yet{isAdmin ? ' — add one above' : ''}.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MONTHLY PICKS PAGE */}
        {page === 'monthly' && (
          <MonthlyPicks
            isAdmin={isAdmin}
            user={user}
            artists={artists}
            onNavigateToArtist={(artist) => {
              setSelectedArtist(artist)
              setPage('artist')
            }}
          />
        )}

        {/* REQUESTS PAGE */}
        {page === 'requests' && (
          <Requests
            isAdmin={isAdmin}
            user={user}
            profile={profile}
          />
        )}

        {/* TOP TEN PAGE */}
        {page === 'topten' && (
          <TopTen
            user={user}
            profile={profile}
            adminProfile={adminProfile}
            allProfiles={allProfiles}
            artists={artists}
            onNavigateToArtist={(artist) => {
              setSelectedArtist(artist)
              setPage('artist')
            }}
          />
        )}

        {/* STATS PAGE */}
        {page === 'stats' && (
          <Stats
            user={user}
            profile={profile}
            artists={artists}
            allProfiles={allProfiles}
          />
        )}
      </main>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-11 h-11 bg-violet-600 hover:bg-violet-500 text-white rounded-full shadow-lg shadow-violet-900/40 flex items-center justify-center transition-all hover:scale-110"
          title="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Modals */}

      {/* Edit Site Settings Modal */}
      {showEditSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Edit Status</h2>
              <button onClick={() => setShowEditSettings(false)} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Currently In Review</label>
                <input
                  value={settingsInReview}
                  onChange={e => setSettingsInReview(e.target.value)}
                  placeholder="e.g. Rush"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">On Deck</label>
                <input
                  value={settingsOnDeck}
                  onChange={e => setSettingsOnDeck(e.target.value)}
                  placeholder="e.g. Foo Fighters"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveSiteSettings}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors">
                  Save
                </button>
                <button onClick={() => setShowEditSettings(false)}
                  className="px-6 py-3 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={loadArtists} />}

      {/* Add Album */}
      {showAddAlbum && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Add Album</h2>
              <button onClick={() => { setShowAddAlbum(false); setNewAlbumName(''); setNewAlbumYear(''); setNewSongs(''); setNewAlbumImageUrl('') }}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Album Name</label>
                <input value={newAlbumName} onChange={e => setNewAlbumName(e.target.value)} placeholder="e.g. OK Computer"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Year (Optional)</label>
                <input value={newAlbumYear} onChange={e => setNewAlbumYear(e.target.value)} placeholder="e.g. 1997"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <ImageUpload bucket="album-images" existingUrl={newAlbumImageUrl} onUpload={url => setNewAlbumImageUrl(url || '')} label="Album Cover" />
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Songs (one per line)</label>
                <textarea value={newSongs} onChange={e => setNewSongs(e.target.value)}
                  placeholder={"Airbag\nParanoid Android\nSubterranean Homesick Alien"} rows={8}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={addAlbum} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors">Add Album</button>
                <button onClick={() => { setShowAddAlbum(false); setNewAlbumName(''); setNewAlbumYear(''); setNewSongs(''); setNewAlbumImageUrl('') }}
                  className="px-6 py-3 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Album */}
      {showEditAlbum && editingAlbum && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Edit Album</h2>
              <button onClick={() => { setShowEditAlbum(false); setEditingAlbum(null); setNewSongName(''); setEditingSongId(null); setInsertAfterIdx(null) }}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Album Name</label>
                <input value={editAlbumName} onChange={e => setEditAlbumName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Year</label>
                <input value={editAlbumYear} onChange={e => setEditAlbumYear(e.target.value)} placeholder="e.g. 1997"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Genre</label>
                  <input value={editAlbumGenre} onChange={e => setEditAlbumGenre(e.target.value)} placeholder="e.g. Rock"
                    list="album-genres"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  <datalist id="album-genres">
                    {[...new Set(artists.map(a => a.genre).filter(Boolean))].sort().map(g => <option key={g} value={g} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Subgenre</label>
                  <input value={editAlbumSubgenre} onChange={e => setEditAlbumSubgenre(e.target.value)} placeholder="e.g. Indie Rock"
                    list="album-subgenres"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  <datalist id="album-subgenres">
                    {[...new Set(artists.map(a => a.subgenre).filter(Boolean))].sort().map(g => <option key={g} value={g} />)}
                  </datalist>
                </div>
              </div>
              <ImageUpload bucket="album-images" existingUrl={editAlbumImageUrl} onUpload={url => setEditAlbumImageUrl(url || '')} label="Album Cover" />

              {/* Song management */}
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">
                  Songs <span className="text-zinc-600 normal-case tracking-normal">({editingAlbum.songs.length})</span>
                </label>
                <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 divide-y divide-zinc-700/60 max-h-64 overflow-y-auto mb-2">
                  {/* Insert at beginning */}
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <span className="text-zinc-600 font-mono text-xs w-5 text-right flex-shrink-0">↑</span>
                    <span className="text-zinc-600 text-xs flex-1">beginning of album</span>
                    <button
                      onClick={() => { setInsertAfterIdx(-1); setNewSongName(''); setTimeout(() => document.getElementById('new-song-input')?.focus(), 50) }}
                      className={`p-1 transition-colors ${insertAfterIdx === -1 ? 'text-violet-400' : 'text-zinc-600 hover:text-violet-400'}`}
                      title="Insert at beginning"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {editingAlbum.songs.map((song, idx) => (
                    <div key={song.id}>
                      <div className="flex items-center gap-2 px-3 py-2">
                        <span className="text-zinc-600 font-mono text-xs w-5 text-right flex-shrink-0">{idx + 1}</span>
                        {editingSongId === song.id ? (
                          <input
                            value={editingSongName}
                            onChange={e => setEditingSongName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') renameSong(song.id); if (e.key === 'Escape') { setEditingSongId(null); setEditingSongName('') } }}
                            autoFocus
                            className="flex-1 px-2 py-0.5 bg-zinc-700 border border-violet-500 text-white text-sm rounded-lg focus:outline-none"
                          />
                        ) : (
                          <span className="text-zinc-300 text-sm flex-1 truncate">
                            {song.name}
                            {song.excluded && <span className="text-xs text-amber-500/70 ml-1.5 italic">interlude</span>}
                          </span>
                        )}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {editingSongId === song.id ? (
                            <>
                              <button onClick={() => renameSong(song.id)} className="p-1 text-green-400 hover:text-green-300 transition-colors" title="Save">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { setEditingSongId(null); setEditingSongName('') }} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors" title="Cancel">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => { setInsertAfterIdx(idx); setNewSongName(''); setTimeout(() => document.getElementById('new-song-input')?.focus(), 50) }}
                                className={`p-1 transition-colors text-xs ${insertAfterIdx === idx ? 'text-violet-400' : 'text-zinc-600 hover:text-violet-400'}`}
                                title="Insert after this song"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toggleSongInterlude(song.id, song.excluded)}
                                className={`p-1 transition-colors ${song.excluded ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-600 hover:text-amber-400'}`}
                                title={song.excluded ? 'Unmark as interlude' : 'Mark as interlude'}
                              >
                                <Music className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { setEditingSongId(song.id); setEditingSongName(song.name) }} className="p-1 text-zinc-600 hover:text-violet-400 transition-colors" title="Rename">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteSong(song.id, song.name)} className="p-1 text-zinc-600 hover:text-red-400 transition-colors" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Insert position indicator */}
                {insertAfterIdx !== null && (
                  <p className="text-xs text-violet-400 mb-1">
                    {insertAfterIdx === -1 ? 'Inserting at beginning' : `Inserting after track ${insertAfterIdx + 1}`} — <button onClick={() => setInsertAfterIdx(null)} className="underline">insert at end instead</button>
                  </p>
                )}

                {/* Add song */}
                <div className="flex gap-2">
                  <input
                    id="new-song-input"
                    value={newSongName}
                    onChange={e => setNewSongName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSong()}
                    placeholder={insertAfterIdx === null ? 'Add to end...' : insertAfterIdx === -1 ? 'Insert at beginning...' : `Insert after track ${insertAfterIdx + 1}...`}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button onClick={addSong}
                    className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={saveAlbumEdit} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors">Save</button>
                <button onClick={() => { setShowEditAlbum(false); setEditingAlbum(null); setNewSongName(''); setEditingSongId(null); setInsertAfterIdx(null) }}
                  className="px-6 py-3 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Artist */}
      {showEditArtist && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Edit Artist Info</h2>
              <button onClick={() => setShowEditArtist(false)} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <ImageUpload bucket="artist-images" existingUrl={editImageUrl} onUpload={url => setEditImageUrl(url || '')} label="Artist Photo" />
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Genre</label>
                <input value={editGenre} onChange={e => setEditGenre(e.target.value)} placeholder="e.g. Alternative Rock"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Subgenre</label>
                <input value={editSubgenre} onChange={e => setEditSubgenre(e.target.value)} placeholder="e.g. Art Rock"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Debut Year</label>
                <input value={editDebutYear} onChange={e => setEditDebutYear(e.target.value)} placeholder="e.g. 1991"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">
                  Country Code <span className="text-zinc-600 normal-case tracking-normal">(2-letter, e.g. US, CA, GB — use EN / XS for England / Scotland)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input value={editCountry} onChange={e => setEditCountry(e.target.value.slice(0, 2))} placeholder="e.g. CA"
                    maxLength={2}
                    className="w-24 px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 uppercase" />
                  {editCountry.length === 2 && (
                    <div className="flex items-center gap-2">
                      <img src={getFlagUrl(editCountry)} alt={editCountry}
                        className="w-8 h-6 object-cover rounded border border-zinc-700" />
                      <span className="text-sm text-zinc-300">{getCountryName(editCountry)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveArtistEdit} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors">Save</button>
                <button onClick={() => setShowEditArtist(false)} className="px-6 py-3 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-colors">Cancel</button>
              </div>
              <div className="pt-2 border-t border-zinc-800">
                <button onClick={deleteArtist}
                  className="w-full py-3 text-red-400 hover:text-white hover:bg-red-950/60 border border-red-900/40 hover:border-red-800 rounded-xl transition-all text-sm font-medium">
                  Delete Artist Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
