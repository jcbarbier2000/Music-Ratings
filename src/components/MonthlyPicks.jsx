import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, X, Music, Disc, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const currentMonthLabel = () => {
  const d = new Date()
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function ScoreDisplay({ scores, pickId, compareProfile }) {
  const s = scores[pickId]
  if (!s) return <span className="text-zinc-600 text-sm">—</span>
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className={`font-bold text-sm ${s.userScore !== null ? 'text-violet-400' : 'text-zinc-600'}`}>
        {s.userScore !== null ? (typeof s.userScore === 'number' ? s.userScore.toFixed(2) : s.userScore) : '—'}
      </span>
      {compareProfile && (
        <span className={`text-xs ${s.compareScore !== null ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {s.compareScore !== null ? (typeof s.compareScore === 'number' ? s.compareScore.toFixed(2) : s.compareScore) : '—'}
        </span>
      )}
    </div>
  )
}

function PickTable({ title, items, type, isAdmin, artists, scores, compareProfile, onAdd, onDelete, onNavigateToArtist }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {type === 'single' ? <Music className="w-4 h-4 text-violet-400" /> : <Disc className="w-4 h-4 text-violet-400" />}
          <h3 className="font-bold text-white">{title}</h3>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        {isAdmin && (
          <button onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="px-6 py-8 text-center text-zinc-600 text-sm">No entries yet</div>
      ) : (
        <div>
          <div className="grid grid-cols-[1fr_1.5fr_80px] gap-4 px-6 py-2 border-b border-zinc-800/60">
            <span className="text-xs text-zinc-500 uppercase tracking-widest">Artist</span>
            <span className="text-xs text-zinc-500 uppercase tracking-widest">Title</span>
            <span className="text-xs text-zinc-500 uppercase tracking-widest text-right">Score</span>
          </div>
          {items.map(pick => (
            <div key={pick.id}
              className="grid grid-cols-[1fr_1.5fr_80px] gap-4 px-6 py-3.5 border-b border-zinc-800/40 last:border-0 hover:bg-zinc-800/20 transition-colors items-center">
              <button
                onClick={() => {
                  if (pick.artist_id) {
                    const artist = artists.find(a => a.id === pick.artist_id)
                    if (artist) onNavigateToArtist(artist)
                  }
                }}
                className={`text-sm font-medium text-left truncate ${pick.artist_id ? 'text-violet-400 hover:text-violet-300 transition-colors' : 'text-zinc-300'}`}
              >
                {pick.artist_name}
              </button>
              <span className="text-sm text-zinc-300 truncate">{pick.title}</span>
              <div className="flex items-center justify-end gap-2">
                <ScoreDisplay scores={scores} pickId={pick.id} compareProfile={compareProfile} />
                {isAdmin && (
                  <button onClick={() => onDelete(pick.id)}
                    className="p-1 text-zinc-700 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AddModal({ type, artists, availableMonths, formMonth, formArtistId, formArtistName, formTitle, saving,
  onMonthChange, onArtistIdChange, onArtistNameChange, onTitleChange, onSubmit, onClose }) {
  const [artistOptions, setArtistOptions] = useState([])

  useEffect(() => {
    if (!formArtistId) { setArtistOptions([]); return }
    supabase
      .from('albums')
      .select('name, songs(name, excluded)')
      .eq('artist_id', formArtistId)
      .order('year', { ascending: false })
      .then(({ data }) => {
        const albums = data || []
        if (type === 'single') {
          const names = [...new Set(
            albums.flatMap(a => (a.songs || []).filter(s => !s.excluded).map(s => s.name))
          )].sort((a, b) => a.localeCompare(b))
          setArtistOptions(names)
        } else {
          setArtistOptions(albums.map(a => a.name))
        }
      })
  }, [formArtistId, type])

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Add {type === 'single' ? 'Single / Feature' : 'Album / EP'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Month</label>
            <select value={formMonth} onChange={e => onMonthChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500">
              {[currentMonthLabel(), ...availableMonths.filter(m => m !== currentMonthLabel())].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
              {MONTHS.flatMap(month =>
                [2026, 2025, 2024].map(year => `${month} ${year}`)
              ).filter(m => !availableMonths.includes(m)).slice(0, 24).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Artist</label>
            <select value={formArtistId} onChange={e => onArtistIdChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 mb-2">
              <option value="">— Select from collection —</option>
              {artists.sort((a, b) => a.name.localeCompare(b.name)).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {!formArtistId && (
              <input value={formArtistName} onChange={e => onArtistNameChange(e.target.value)}
                placeholder="Or type artist name manually"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
            )}
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">
              {type === 'single' ? 'Song Title' : 'Album Title'}
            </label>
            {formArtistId && artistOptions.length > 0 ? (
              <select value={formTitle} onChange={e => onTitleChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">— Select {type === 'single' ? 'a song' : 'an album'} —</option>
                {artistOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            ) : (
              <input value={formTitle} onChange={e => onTitleChange(e.target.value)}
                placeholder={type === 'single' ? 'e.g. Merry Go' : 'e.g. Your Favorite Toy'}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onSubmit} disabled={saving}
              className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
              {saving ? 'Adding...' : 'Add Entry'}
            </button>
            <button onClick={onClose}
              className="px-6 py-3 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MonthlyPicks({ isAdmin, user, artists, onNavigateToArtist }) {
  const [picks, setPicks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthLabel())
  const [availableMonths, setAvailableMonths] = useState([currentMonthLabel()])
  const [showAddSingle, setShowAddSingle] = useState(false)
  const [showAddAlbum, setShowAddAlbum] = useState(false)
  const [scores, setScores] = useState({})
  const [allProfiles, setAllProfiles] = useState([])
  const [compareProfile, setCompareProfile] = useState(null)

  const [formArtistId, setFormArtistId] = useState('')
  const [formArtistName, setFormArtistName] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formMonth, setFormMonth] = useState(currentMonthLabel())
  const [saving, setSaving] = useState(false)

  // Keep compareProfile ref so loadScores always has the latest value
  const compareProfileRef = useRef(compareProfile)
  useEffect(() => { compareProfileRef.current = compareProfile }, [compareProfile])

  useEffect(() => {
    loadMonths()
    supabase.from('profiles').select('*').order('username')
      .then(({ data }) => setAllProfiles(data || []))
  }, [])

  useEffect(() => {
    if (selectedMonth) loadPicks()
  }, [selectedMonth])

  // Reload scores when compare profile changes (picks are already loaded)
  useEffect(() => {
    if (picks.length) loadScores(picks, compareProfile)
  }, [compareProfile])

  const loadMonths = async () => {
    const { data } = await supabase
      .from('monthly_picks')
      .select('month')
      .order('created_at', { ascending: false })
    const unique = [...new Set([currentMonthLabel(), ...(data || []).map(r => r.month)])]
    setAvailableMonths(unique)
  }

  const getSongIds = async (pick) => {
    if (pick.type === 'single') {
      const { data: artistAlbums } = await supabase
        .from('albums').select('id').eq('artist_id', pick.artist_id)
      const albumIds = (artistAlbums || []).map(a => a.id)
      if (!albumIds.length) return []
      const { data: songs } = await supabase
        .from('songs').select('id').eq('name', pick.title).in('album_id', albumIds)
      return (songs || []).map(s => s.id)
    } else {
      const { data: albums } = await supabase
        .from('albums').select('id, songs(id)').eq('artist_id', pick.artist_id).eq('name', pick.title)
      return (albums?.[0]?.songs || []).map(s => s.id)
    }
  }

  const loadScores = async (pickList, cmpProfile) => {
    const scoreMap = {}
    for (const pick of pickList) {
      if (!pick.artist_id) continue

      const songIds = await getSongIds(pick)
      if (!songIds.length) continue

      const { data: ratings } = await supabase
        .from('ratings').select('user_id, rating').in('song_id', songIds)
      if (!ratings?.length) continue

      // For albums, average per user; for singles, take direct rating
      const avgByUser = {}
      if (pick.type === 'album') {
        const totals = {}
        ratings.forEach(r => {
          if (!totals[r.user_id]) totals[r.user_id] = { sum: 0, count: 0 }
          totals[r.user_id].sum += r.rating
          totals[r.user_id].count++
        })
        Object.entries(totals).forEach(([uid, { sum, count }]) => {
          avgByUser[uid] = sum / count
        })
      } else {
        ratings.forEach(r => { avgByUser[r.user_id] = r.rating })
      }

      const userScore = user ? (avgByUser[user.id] ?? null) : null
      const compareScore = cmpProfile ? (avgByUser[cmpProfile.id] ?? null) : null

      // Fall back to any score if user hasn't rated
      const anyScore = Object.values(avgByUser)[0] ?? null
      scoreMap[pick.id] = { userScore: userScore ?? anyScore, compareScore }
    }
    setScores(scoreMap)
  }

  const loadPicks = async () => {
    setLoading(true)
    const { data: pickData } = await supabase
      .from('monthly_picks')
      .select('*, artists(id, name, image_url)')
      .eq('month', selectedMonth)
      .order('created_at', { ascending: true })

    const pickList = pickData || []
    setPicks(pickList)
    await loadScores(pickList, compareProfileRef.current)
    setLoading(false)
  }

  const addPick = async (type) => {
    if (!formTitle.trim() || (!formArtistId && !formArtistName.trim())) return
    setSaving(true)

    const artistId = formArtistId || null
    const artistName = formArtistId
      ? artists.find(a => a.id === formArtistId)?.name || formArtistName
      : formArtistName.trim()

    await supabase.from('monthly_picks').insert({
      month: formMonth, type, artist_id: artistId, artist_name: artistName, title: formTitle.trim(),
    })

    setFormArtistId('')
    setFormArtistName('')
    setFormTitle('')
    setSaving(false)
    setShowAddSingle(false)
    setShowAddAlbum(false)
    await loadMonths()
    setSelectedMonth(formMonth)
    loadPicks()
  }

  const deletePick = async (id) => {
    if (!confirm('Remove this entry?')) return
    await supabase.from('monthly_picks').delete().eq('id', id)
    loadPicks()
  }

  const singles = picks.filter(p => p.type === 'single')
  const albums = picks.filter(p => p.type === 'album')

  const otherProfiles = allProfiles.filter(p => p.id !== user?.id)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">New Music of the Month</h1>
          <p className="text-zinc-500 text-sm mt-1">Scores pulled from artist pages automatically</p>
        </div>
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="appearance-none bg-zinc-900 border border-zinc-700 text-white text-sm pl-4 pr-10 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {/* Compare selector */}
      {otherProfiles.length > 0 && (
        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
          <span className="text-xs text-zinc-500 uppercase tracking-widest flex-shrink-0">Compare with</span>
          <select
            value={compareProfile?.id || ''}
            onChange={e => setCompareProfile(allProfiles.find(p => p.id === e.target.value) || null)}
            className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Nobody</option>
            {otherProfiles.map(p => (
              <option key={p.id} value={p.id}>{p.username}{p.is_admin ? ' (Admin)' : ''}</option>
            ))}
          </select>
          {compareProfile && (
            <div className="flex flex-col items-end text-xs gap-0.5 flex-shrink-0">
              <span className="text-violet-400 font-medium">You</span>
              <span className="text-zinc-500">{compareProfile.username}</span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-zinc-600">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PickTable
            title="Singles & Features"
            items={singles}
            type="single"
            isAdmin={isAdmin}
            artists={artists}
            scores={scores}
            compareProfile={compareProfile}
            onAdd={() => setShowAddSingle(true)}
            onDelete={deletePick}
            onNavigateToArtist={onNavigateToArtist}
          />
          <PickTable
            title="Albums & EPs"
            items={albums}
            type="album"
            isAdmin={isAdmin}
            artists={artists}
            scores={scores}
            compareProfile={compareProfile}
            onAdd={() => setShowAddAlbum(true)}
            onDelete={deletePick}
            onNavigateToArtist={onNavigateToArtist}
          />
        </div>
      )}

      {showAddSingle && (
        <AddModal
          type="single"
          artists={artists}
          availableMonths={availableMonths}
          formMonth={formMonth}
          formArtistId={formArtistId}
          formArtistName={formArtistName}
          formTitle={formTitle}
          saving={saving}
          onMonthChange={setFormMonth}
          onArtistIdChange={v => { setFormArtistId(v); setFormArtistName('') }}
          onArtistNameChange={setFormArtistName}
          onTitleChange={setFormTitle}
          onSubmit={() => addPick('single')}
          onClose={() => setShowAddSingle(false)}
        />
      )}
      {showAddAlbum && (
        <AddModal
          type="album"
          artists={artists}
          availableMonths={availableMonths}
          formMonth={formMonth}
          formArtistId={formArtistId}
          formArtistName={formArtistName}
          formTitle={formTitle}
          saving={saving}
          onMonthChange={setFormMonth}
          onArtistIdChange={v => { setFormArtistId(v); setFormArtistName('') }}
          onArtistNameChange={setFormArtistName}
          onTitleChange={setFormTitle}
          onSubmit={() => addPick('album')}
          onClose={() => setShowAddAlbum(false)}
        />
      )}
    </div>
  )
}
