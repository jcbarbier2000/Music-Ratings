import React, { useState } from 'react'
import { X, Upload, HelpCircle, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ImportModal({ onClose, onImported }) {
  const [artistName, setArtistName] = useState('')
  const [genre, setGenre] = useState('')
  const [subgenre, setSubgenre] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [log, setLog] = useState([])
  const [preview, setPreview] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastAlbumIsNonAlbum, setLastAlbumIsNonAlbum] = useState(true)

  const parseCSV = text => {
    const rows = []
    const lines = text.split('\n')
    for (const line of lines) {
      if (!line.trim()) continue
      const cells = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
          else inQuotes = !inQuotes
        } else if (ch === ',' && !inQuotes) {
          cells.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
      cells.push(current.trim())
      rows.push(cells)
    }
    return rows
  }

  const handleFile = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => parse(parseCSV(ev.target.result))
    reader.readAsText(file)
  }

  const parse = (data) => {
    const msgs = []
    if (!artistName.trim()) {
      setStatus({ type: 'error', message: 'Enter artist name first' })
      return
    }
    if (data.length < 2) {
      setStatus({ type: 'error', message: 'CSV needs at least 2 rows' })
      return
    }

    // Detect year row
    const yearPattern = /^(19|20)\d{2}$/
    let songStart = 1
    if (data.length >= 3) {
      const row2 = data[1]
      const cells = row2.filter((_, i) => i % 3 === 0).filter(c => c)
      const yearCount = cells.filter(c => yearPattern.test(c)).length
      if (cells.length && yearCount / cells.length > 0.5) {
        songStart = 2
        msgs.push('Year row detected')
      }
    }

    const albumRow = data[0]
    const yearRow = songStart === 2 ? data[1] : null
    const albums = []

    for (let col = 0; col < albumRow.length; col += 3) {
      const name = albumRow[col]?.trim()
      if (!name) continue
      const year = yearRow ? yearRow[col]?.trim() : null
      const songs = []

      for (let row = songStart; row < data.length; row++) {
        const song = data[row][col]?.trim()
        const ratingRaw = data[row][col + 1]?.trim()
        if (!song) continue
        // 'x' or 'X' means excluded — import the song but don't rate it
        const isExcluded = ratingRaw?.toLowerCase() === 'x'
        const rating = !isExcluded && ratingRaw && !isNaN(ratingRaw) ? parseFloat(ratingRaw) : null
        songs.push({ name: song, rating, excluded: isExcluded })
      }

      albums.push({ name, year: year || null, songs, is_non_album: false })
    }

    // Mark last album as non-album if toggle is on
    if (lastAlbumIsNonAlbum && albums.length > 0) {
      albums[albums.length - 1].is_non_album = true
      msgs.push(`"${albums[albums.length - 1].name}" marked as non-album (Singles/Features/etc.)`)
    }

    msgs.push(`Found ${albums.length} albums, ${albums.reduce((s, a) => s + a.songs.filter(s => !s.excluded).length, 0)} songs (${albums.reduce((s, a) => s + a.songs.filter(s => s.excluded).length, 0)} excluded)`)
    setLog(msgs)
    setPreview({ name: artistName.trim(), genre, subgenre, albums })
    setStatus({ type: 'success', message: `Preview ready: ${albums.length} albums` })
  }

  const confirm = async () => {
    if (!preview) return
    setSaving(true)
    try {
      const { data: artist, error: artistErr } = await supabase
        .from('artists')
        .upsert({ name: preview.name, genre: genre || null, subgenre: subgenre || null },
                 { onConflict: 'name' })
        .select().single()
      if (artistErr) throw artistErr

      // Track song names seen across all albums to avoid duplicate ratings
      const seenSongNames = new Set()

      for (const album of preview.albums) {
        const { data: alb, error: albErr } = await supabase
          .from('albums')
          .upsert({ artist_id: artist.id, name: album.name, year: album.year, is_non_album: album.is_non_album },
                   { onConflict: 'artist_id,name' })
          .select().single()
        if (albErr) throw albErr

        for (let i = 0; i < album.songs.length; i++) {
          const song = album.songs[i]
          const { data: s, error: sErr } = await supabase
            .from('songs')
            .upsert({ album_id: alb.id, name: song.name, track_order: i, excluded: song.excluded || false },
                     { onConflict: 'album_id,name' })
            .select().single()
          if (sErr) throw sErr

          // Skip rating if excluded (x-rated) or already seen
          const nameKey = song.name.toLowerCase().trim()
          if (song.rating !== null && !song.excluded && !seenSongNames.has(nameKey)) {
            const rounded = Math.round(song.rating)
            await supabase.rpc('upsert_rating', { p_song_id: s.id, p_rating: Math.min(10, Math.max(1, rounded)) })
          }
          seenSongNames.add(nameKey)
        }
      }

      setStatus({ type: 'success', message: 'Import complete!' })
      setTimeout(() => { onImported(); onClose() }, 1200)
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Import Artist CSV</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowHelp(!showHelp)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <HelpCircle className="w-5 h-5 text-zinc-400" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {showHelp && (
            <div className="bg-indigo-950/50 border border-indigo-800/60 rounded-xl p-4 text-sm text-indigo-300">
              <p className="font-semibold mb-2">CSV Format (Artist Tab)</p>
              <p>Row 1: Album names (every 3 columns: Name, _, _)</p>
              <p>Row 2 (optional): Album years — auto-detected if 4-digit numbers</p>
              <p>Remaining rows: Song name, Rating (1–10), blank — repeated per album</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Artist Name</label>
              <input value={artistName} onChange={e => setArtistName(e.target.value)}
                placeholder="e.g. Radiohead"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Genre</label>
                <input value={genre} onChange={e => setGenre(e.target.value)}
                  placeholder="e.g. Alternative Rock"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Subgenre</label>
                <input value={subgenre} onChange={e => setSubgenre(e.target.value)}
                  placeholder="e.g. Art Rock"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
          </div>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 rounded-xl p-8 cursor-pointer hover:border-violet-500 transition-colors bg-zinc-800/30">
            <Upload className="w-8 h-8 text-zinc-500 mb-2" />
            <span className="text-zinc-400">Choose CSV file</span>
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>

          {status.message && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border ${
              status.type === 'success'
                ? 'bg-green-950/50 border-green-800/60 text-green-400'
                : 'bg-red-950/50 border-red-800/60 text-red-400'
            }`}>
              {status.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {status.message}
            </div>
          )}

          {log.length > 0 && (
            <div className="bg-zinc-800/50 rounded-xl p-4 font-mono text-xs text-zinc-500 space-y-1">
              {log.map((l, i) => <div key={i}>• {l}</div>)}
            </div>
          )}

          {preview && (
            <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-white">{preview.name}</p>
              {preview.albums.map(a => (
                <div key={a.name} className="text-xs text-zinc-500 pl-3">
                  {a.name} {a.year ? `(${a.year})` : ''} — {a.songs.length} songs
                </div>
              ))}
            </div>
          )}

          {preview && (
            <div className="flex gap-3">
              <button onClick={confirm} disabled={saving}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50">
                {saving ? 'Importing...' : 'Confirm Import'}
              </button>
              <button onClick={() => { setPreview(null); setLog([]); setStatus({ type: '', message: '' }) }}
                className="px-6 py-3 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
