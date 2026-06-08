import React from 'react'
import { Search, SlidersHorizontal, X, Ticket } from 'lucide-react'
import { getCountryName } from '../lib/countries'

const SORT_OPTIONS = [
  { value: 'az', label: 'A → Z' },
  { value: 'za', label: 'Z → A' },
  { value: 'score_desc', label: 'Score ↓' },
  { value: 'score_asc', label: 'Score ↑' },
  { value: 'tens_desc', label: 'Most Tens' },
  { value: 'live_desc', label: 'Most Seen Live' },
  { value: 'year_asc', label: 'Oldest First' },
  { value: 'year_desc', label: 'Newest First' },
]

const SCORE_OPTIONS = [
  { value: '', label: 'Any Score' },
  { value: '6', label: '6.0+' },
  { value: '7', label: '7.0+' },
  { value: '8', label: '8.0+' },
  { value: '9', label: '9.0+' },
]

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

function Select({ value, onChange, children, className = '' }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`px-3 py-2 bg-zinc-800 border border-zinc-700 text-sm text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer ${className}`}
    >
      {children}
    </select>
  )
}

function Toggle({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
        active
          ? 'bg-violet-600/30 border-violet-500/60 text-violet-300'
          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

export function getDecadeLabel(year) {
  return getDecade(year)
}

export default function HomeFilters({ artists, artistScores, liveShowCounts, newMusicArtistIds, filters, setFilters, search, setSearch }) {
  // Derive available options from artist data
  const genres = [...new Set(artists.map(a => a.genre).filter(Boolean))].sort()
  const subgenres = [...new Set(artists.map(a => a.subgenre).filter(Boolean))].sort()
  const countries = [...new Set(artists.map(a => a.country).filter(Boolean))]
    .sort((a, b) => getCountryName(a).localeCompare(getCountryName(b)))
  const decades = [...new Set(artists.map(a => getDecade(a.debut_year)).filter(Boolean))]
    .sort((a, b) => {
      const order = ['Pre-1960', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s']
      return order.indexOf(a) - order.indexOf(b)
    })

  const setFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

  const activeCount = [
    filters.genre, filters.subgenre, filters.country, filters.decade, filters.minScore
  ].filter(Boolean).length + (filters.seenLive ? 1 : 0) + (filters.newMusic ? 1 : 0)

  const clearAll = () => setFilters({
    genre: '', subgenre: '', country: '', decade: '', minScore: '',
    seenLive: false, newMusic: false, sortBy: 'az',
  })

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search artists, genres..."
          className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium mr-1">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filter</span>
        </div>

        {/* Sort */}
        <Select value={filters.sortBy} onChange={v => setFilter('sortBy', v)}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>

        {/* Genre */}
        {genres.length > 0 && (
          <Select value={filters.genre} onChange={v => setFilter('genre', v)}>
            <option value="">All Genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </Select>
        )}

        {/* Subgenre */}
        {subgenres.length > 0 && (
          <Select value={filters.subgenre} onChange={v => setFilter('subgenre', v)}>
            <option value="">All Subgenres</option>
            {subgenres.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        )}

        {/* Country */}
        {countries.length > 0 && (
          <Select value={filters.country} onChange={v => setFilter('country', v)}>
            <option value="">All Countries</option>
            {countries.map(c => <option key={c} value={c}>{getCountryName(c)}</option>)}
          </Select>
        )}

        {/* Decade */}
        {decades.length > 0 && (
          <Select value={filters.decade} onChange={v => setFilter('decade', v)}>
            <option value="">Any Era</option>
            {decades.map(d => <option key={d} value={d}>{d}</option>)}
          </Select>
        )}

        {/* Min score */}
        <Select value={filters.minScore} onChange={v => setFilter('minScore', v)}>
          {SCORE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>

        {/* Seen live toggle */}
        <Toggle active={filters.seenLive} onClick={() => setFilter('seenLive', !filters.seenLive)}>
          <Ticket className="w-3.5 h-3.5" />
          Seen Live
        </Toggle>

        {/* New music toggle */}
        <Toggle active={filters.newMusic} onClick={() => setFilter('newMusic', !filters.newMusic)}>
          New Music
        </Toggle>

        {/* Clear */}
        {(activeCount > 0 || search) && (
          <button
            onClick={() => { clearAll(); setSearch('') }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear
            {activeCount > 0 && (
              <span className="ml-0.5 text-xs bg-violet-600 text-white px-1.5 py-0.5 rounded-full">{activeCount}</span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export { getDecade }
