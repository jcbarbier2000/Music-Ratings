import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Music, Home, Search, TrendingUp, Disc, ListMusic, Plus, Trash2, LogOut, Upload, ChevronLeft, X, Pencil, ChevronDown, ChevronUp, ArrowUp } from 'lucide-react'
import { supabase } from './lib/supabase'
import { useAuth } from './hooks/useAuth'
import Login from './components/Login'
import StarRating from './components/StarRating'
import AlbumChart from './components/AlbumChart'
import ImportModal from './components/ImportModal'
import ImageUpload from './components/ImageUpload'
import ResetPassword from './components/ResetPassword'

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
  const [dataLoading, setDataLoading] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showAddAlbum, setShowAddAlbum] = useState(false)
  const [showEditArtist, setShowEditArtist] = useState(false)
  const [showEditAlbum, setShowEditAlbum] = useState(false)
  const [editingAlbum, setEditingAlbum] = useState(null)
  const [editAlbumName, setEditAlbumName] = useState('')
  const [editAlbumYear, setEditAlbumYear] = useState('')
  const [editAlbumImageUrl, setEditAlbumImageUrl] = useState('')
  const [editGenre, setEditGenre] = useState('')
  const [editSubgenre, setEditSubgenre] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editDebutYear, setEditDebutYear] = useState('')
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
    window.location.pathname.match(/^\/artist\/(.+)$/)?.[1] || null
  )

  // Sync page state to URL — but only if we're not mid-restore
  useEffect(() => {
    if (pendingSlugRef.current) return // don't overwrite URL while restoring
    if (page === 'artist' && selectedArtist) {
      window.history.replaceState(null, '', `/artist/${slugify(selectedArtist.name)}`)
    } else {
      window.history.replaceState(null, '', '/')
    }
  }, [page, selectedArtist])

  // Restore page from URL once artists are loaded
  useEffect(() => {
    if (!pendingSlugRef.current || artists.length === 0) return
    const slug = pendingSlugRef.current
    const artist = artists.find(a => slugify(a.name) === slug)
    if (artist) {
      pendingSlugRef.current = null // clear so URL sync works normally after
      setSelectedArtist(artist)
      setPage('artist')
    } else {
      pendingSlugRef.current = null // slug not found, go home
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

    // Total albums (excluding non-album labels)
    const NON = ['singles', 'features', 'b-sides', 'eps', 'live', 'demos', 'rarities', 'extras', 'other']
    const { data: allAlbums } = await supabase.from('albums').select('id, name')
    const { data: allSongs } = await supabase.from('songs').select('id')

    const totalAlbums = (allAlbums || []).filter(a => !NON.includes(a.name.toLowerCase().trim())).length
    const totalSongs = (allSongs || []).length

    // Admin rated songs
    const { count: adminRatedSongs } = await supabase
      .from('ratings').select('*', { count: 'exact', head: true })
      .eq('user_id', adminProfile.id)

    // User rated songs (skip if user is admin)
    let userRatedSongs = null
    if (user.id !== adminProfile.id) {
      const { count } = await supabase
        .from('ratings').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      userRatedSongs = count
    }

    setStats({ totalAlbums, totalSongs, adminRatedSongs: adminRatedSongs || 0, userRatedSongs })
  }, [user, adminProfile])

  useEffect(() => {
    if (user && adminProfile) loadStats()
  }, [user, adminProfile, loadStats])
    const { data } = await supabase.from('artists').select('*').order('name')
    setArtists(data || [])
  }, [])

  useEffect(() => { if (user) loadArtists() }, [user, loadArtists])

  const loadArtistDetail = useCallback(async (artist) => {
    setDataLoading(true)
    const { data: albums } = await supabase
      .from('albums')
      .select('*, songs(id, name, track_order)')
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
      const { data: ur } = await supabase
        .from('ratings').select('song_id, rating')
        .eq('user_id', user.id).in('song_id', songIds)
      const map = {}
      ;(ur || []).forEach(r => { map[r.song_id] = r.rating })
      setUserRatings(map)
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
    const { data: cr } = await supabase
      .from('ratings').select('song_id, rating')
      .eq('user_id', compareProfile.id).in('song_id', songIds)
    const cmap = {}
    ;(cr || []).forEach(r => { cmap[r.song_id] = r.rating })
    setCompareRatings(cmap)
  }, [compareProfile, user])

  useEffect(() => {
    if (!artistDetail) return
    const songIds = artistDetail.albums.flatMap(a => a.songs.map(s => s.id))
    loadCompareRatings(songIds)
  }, [artistDetail, loadCompareRatings])

  useEffect(() => {
    if (selectedArtist && adminProfile !== undefined) loadArtistDetail(selectedArtist)
  }, [selectedArtist, loadArtistDetail])

  const rate = async (songId, rating) => {
    setUserRatings(prev => ({ ...prev, [songId]: rating }))
    await supabase.rpc('upsert_rating', { p_song_id: songId, p_rating: rating })
  }

  const albumAvg = (songs, ratingMap) => {
    const vals = songs.map(s => ratingMap[s.id] || 0).filter(v => v > 0)
    if (!vals.length) return null
    return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)
  }

  const saveArtistEdit = async () => {
    const updates = {
      genre: editGenre || null,
      subgenre: editSubgenre || null,
      image_url: editImageUrl || null,
      debut_year: editDebutYear || null,
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
    setEditAlbumImageUrl(album.image_url || '')
    setShowEditAlbum(true)
  }

  const saveAlbumEdit = async () => {
    const updates = {
      name: editAlbumName.trim() || editingAlbum.name,
      year: editAlbumYear.trim() || null,
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

  const filtered = artists.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.genre || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.subgenre || '').toLowerCase().includes(search.toLowerCase())
  )

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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white">Collection</h1>
                <p className="text-zinc-500 text-sm mt-1">{artists.length} artists</p>
              </div>
              {isAdmin && (
                <button onClick={() => setShowImport(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors">
                  <Upload className="w-4 h-4" />Import CSV
                </button>
              )}
            </div>

            {/* Stats panel */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Artists */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Artists</p>
                  <p className="text-3xl font-bold text-white">{artists.length}</p>
                </div>

                {/* Albums */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Albums</p>
                  <p className="text-3xl font-bold text-white">{stats.totalAlbums}</p>
                </div>

                {/* Songs */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 col-span-2 sm:col-span-1">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Songs</p>
                  <p className="text-3xl font-bold text-white">{stats.totalSongs}</p>
                </div>

                {/* Admin rated */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{adminProfile?.username} Rated</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-3xl font-bold text-violet-400">{stats.adminRatedSongs}</p>
                    <p className="text-sm text-zinc-600">/ {stats.totalSongs}</p>
                  </div>
                  <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-600 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (stats.adminRatedSongs / stats.totalSongs) * 100)}%` }} />
                  </div>
                </div>

                {/* User rated — only shown if user is not admin */}
                {stats.userRatedSongs !== null && (
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Your Rated</p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-3xl font-bold text-indigo-400">{stats.userRatedSongs}</p>
                      <p className="text-sm text-zinc-600">/ {stats.adminRatedSongs}</p>
                    </div>
                    <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (stats.userRatedSongs / Math.max(1, stats.adminRatedSongs)) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-zinc-600 mt-1">of {adminProfile?.username}'s rated songs</p>
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search artists, genres..."
                className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>

            {Object.keys(genreStats).length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Genres</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(genreStats).sort((a, b) => b[1] - a[1]).map(([genre, count]) => (
                    <div key={genre} className="flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-lg">
                      <span className="text-sm text-zinc-300">{genre}</span>
                      <span className="text-xs font-bold text-violet-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(artist => (
                <button key={artist.id}
                  onClick={() => { setSelectedArtist(artist); setPage('artist') }}
                  className="bg-zinc-900 border border-zinc-800 hover:border-violet-500/60 rounded-2xl p-4 text-left transition-all group">
                  <div className="flex items-center gap-4">
                    {artist.image_url ? (
                      <img src={artist.image_url} alt={artist.name}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-zinc-700" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <Music className="w-6 h-6 text-violet-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-white group-hover:text-violet-300 transition-colors truncate">{artist.name}</div>
                      {artist.genre && (
                        <div className="text-xs text-zinc-500 truncate mt-0.5">
                          {artist.genre}{artist.subgenre ? ` · ${artist.subgenre}` : ''}
                        </div>
                      )}
                      {artist.debut_year && (
                        <div className="text-xs text-zinc-600 mt-0.5">Est. {artist.debut_year}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
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
                    <div className="flex gap-4 mt-2 text-xs sm:text-sm text-zinc-500">
                      <span className="flex items-center gap-1"><Disc className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{albumCount(artistDetail?.albums)} albums</span>
                      <span className="flex items-center gap-1"><ListMusic className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{artistDetail?.albums.reduce((s, a) => s + a.songs.length, 0) || 0} songs</span>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => {
                    setEditGenre(selectedArtist.genre || '')
                    setEditSubgenre(selectedArtist.subgenre || '')
                    setEditImageUrl(selectedArtist.image_url || '')
                    setEditDebutYear(selectedArtist.debut_year || '')
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

            {/* Album controls */}
            {artistDetail && artistDetail.albums.length > 0 && (
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

            {!artistDetail?.albums.length && isAdmin && (
              <div className="flex justify-end">
                <button onClick={() => setShowAddAlbum(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors">
                  <Plus className="w-4 h-4" />Add Album
                </button>
              </div>
            )}

            {dataLoading ? (
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
                        className="bg-zinc-800/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800/80 transition-colors select-none"
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
                              {uAvg && <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">{uAvg}</span>}
                              {aAvg && <span className="px-2 py-0.5 bg-violet-900/80 text-violet-300 text-xs font-medium rounded-full">{compareProfile?.username || 'Admin'} {aAvg}</span>}
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
                            const uRating = userRatings[song.id] || 0
                            const aRating = compareProfile?.id !== user?.id ? (compareRatings[song.id] || 0) : 0
                            return (
                              <div key={song.id} className="px-4 sm:px-6 py-3 hover:bg-zinc-800/30 transition-colors">
                                <div className="flex items-start gap-3">
                                  <span className="text-zinc-600 font-mono text-xs w-5 text-right flex-shrink-0 mt-1">{idx + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-zinc-200 text-sm block truncate">{song.name}</span>
                                    {/* Mobile: ratings below song name */}
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
                                  </div>
                                  {/* Desktop: ratings inline */}
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
            )}
          </div>
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
              <button onClick={() => { setShowEditAlbum(false); setEditingAlbum(null) }}
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
              <ImageUpload bucket="album-images" existingUrl={editAlbumImageUrl} onUpload={url => setEditAlbumImageUrl(url || '')} label="Album Cover" />
              <div className="flex gap-3 pt-2">
                <button onClick={saveAlbumEdit} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors">Save</button>
                <button onClick={() => { setShowEditAlbum(false); setEditingAlbum(null) }}
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
