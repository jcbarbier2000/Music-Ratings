import React, { useState, useEffect } from 'react'
import { Plus, X, Check, Trash2, Clock, CheckCircle, XCircle, Music, MessageSquare, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

const TABS = [
  { key: 'artist', label: 'Artist Requests', table: 'artist_requests', icon: Users },
  { key: 'rerate', label: 'Re-Rate Requests', table: 'rerate_requests', icon: Music },
  { key: 'site', label: 'Site Requests', table: 'site_requests', icon: MessageSquare },
]

const statusIcon = (status) => {
  if (status === 'pending') return <Clock className="w-3.5 h-3.5 text-amber-400" />
  if (status === 'approved') return <CheckCircle className="w-3.5 h-3.5 text-green-400" />
  return <XCircle className="w-3.5 h-3.5 text-red-400" />
}

const statusClass = (status) => {
  if (status === 'pending') return 'text-amber-400 bg-amber-950/50 border-amber-800/50'
  if (status === 'approved') return 'text-green-400 bg-green-950/50 border-green-800/50'
  return 'text-red-400 bg-red-950/50 border-red-800/50'
}

function RequestCard({ req, tab, isAdmin, onStatus, onDelete }) {
  const title = tab === 'artist' ? req.artist_name
    : tab === 'rerate' ? req.artist_name
    : req.title

  const subtitle = tab === 'rerate'
    ? req.album_name
    : null

  const body = tab === 'site' ? req.description : req.notes

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-white text-lg">{title}</h3>
            {subtitle && (
              <span className="text-zinc-400 text-sm">{subtitle}</span>
            )}
            <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${statusClass(req.status)}`}>
              {statusIcon(req.status)}
              {req.status}
            </span>
          </div>
          {body && (
            <p className="text-sm text-zinc-400 mt-1.5">{body}</p>
          )}
          <p className="text-xs text-zinc-600 mt-2">
            Requested by <span className="text-zinc-500">{req.username}</span> · {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isAdmin && req.status === 'pending' && (
            <>
              <button
                onClick={() => onStatus(req.id, 'approved')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/50 hover:bg-green-800/60 text-green-400 text-xs font-medium rounded-lg border border-green-800/50 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />Approve
              </button>
              <button
                onClick={() => onStatus(req.id, 'declined')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/50 hover:bg-red-900/60 text-red-400 text-xs font-medium rounded-lg border border-red-800/50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />Decline
              </button>
            </>
          )}
          {isAdmin && (
            <button
              onClick={() => onDelete(req.id)}
              className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ArtistForm({ user, profile, onSubmit, onClose }) {
  const [artistName, setArtistName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (!artistName.trim()) { setError('Please enter an artist name'); return }
    setSaving(true)
    const { error: err } = await supabase.from('artist_requests').insert({
      requested_by: user.id,
      username: profile.username,
      artist_name: artistName.trim(),
      notes: notes.trim() || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    onSubmit()
  }

  return (
    <FormShell title="Request an Artist" onClose={onClose}>
      <Field label="Artist Name">
        <input value={artistName} onChange={e => setArtistName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="e.g. Radiohead"
          className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </Field>
      <Field label="Notes" optional>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Why should this artist be added?"
          rows={3}
          className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none text-sm" />
      </Field>
      <FormActions error={error} saving={saving} onSubmit={submit} onClose={onClose} />
    </FormShell>
  )
}

function RerateForm({ user, profile, onSubmit, onClose }) {
  const [artistName, setArtistName] = useState('')
  const [albumName, setAlbumName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (!artistName.trim()) { setError('Please enter an artist name'); return }
    if (!albumName.trim()) { setError('Please enter an album name'); return }
    setSaving(true)
    const { error: err } = await supabase.from('rerate_requests').insert({
      requested_by: user.id,
      username: profile.username,
      artist_name: artistName.trim(),
      album_name: albumName.trim(),
      notes: notes.trim() || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    onSubmit()
  }

  return (
    <FormShell title="Request a Re-Rate" onClose={onClose}>
      <Field label="Artist Name">
        <input value={artistName} onChange={e => setArtistName(e.target.value)}
          placeholder="e.g. Radiohead"
          className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </Field>
      <Field label="Album Name">
        <input value={albumName} onChange={e => setAlbumName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="e.g. OK Computer"
          className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </Field>
      <Field label="Notes" optional>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Why should this album be re-listened to?"
          rows={3}
          className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none text-sm" />
      </Field>
      <FormActions error={error} saving={saving} onSubmit={submit} onClose={onClose} />
    </FormShell>
  )
}

function SiteForm({ user, profile, onSubmit, onClose }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (!title.trim()) { setError('Please enter a title'); return }
    setSaving(true)
    const { error: err } = await supabase.from('site_requests').insert({
      requested_by: user.id,
      username: profile.username,
      title: title.trim(),
      description: description.trim() || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    onSubmit()
  }

  return (
    <FormShell title="Submit a Site Request" onClose={onClose}>
      <Field label="Title">
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Add dark mode toggle"
          className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </Field>
      <Field label="Description" optional>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Describe the feature or improvement you'd like to see..."
          rows={4}
          className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none text-sm" />
      </Field>
      <FormActions error={error} saving={saving} onSubmit={submit} onClose={onClose} />
    </FormShell>
  )
}

function FormShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, optional, children }) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">
        {label}{optional && <span className="text-zinc-600 normal-case tracking-normal ml-1">(optional)</span>}
      </label>
      {children}
    </div>
  )
}

function FormActions({ error, saving, onSubmit, onClose }) {
  return (
    <>
      {error && (
        <div className="bg-red-950/50 border border-red-800/60 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}
      <div className="flex gap-3 pt-2">
        <button onClick={onSubmit} disabled={saving}
          className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
          {saving ? 'Submitting...' : 'Submit Request'}
        </button>
        <button onClick={onClose}
          className="px-6 py-3 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-colors">
          Cancel
        </button>
      </div>
    </>
  )
}

export default function Requests({ isAdmin, user, profile }) {
  const [activeTab, setActiveTab] = useState('artist')
  const [requests, setRequests] = useState({ artist: [], rerate: [], site: [] })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [artistRes, rerateRes, siteRes] = await Promise.all([
      supabase.from('artist_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('rerate_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('site_requests').select('*').order('created_at', { ascending: false }),
    ])
    setRequests({
      artist: artistRes.data || [],
      rerate: rerateRes.data || [],
      site: siteRes.data || [],
    })
    setLoading(false)
  }

  const updateStatus = async (id, status) => {
    const table = TABS.find(t => t.key === activeTab).table
    await supabase.from(table).update({ status }).eq('id', id)
    loadAll()
  }

  const deleteRequest = async (id) => {
    if (!confirm('Delete this request?')) return
    const table = TABS.find(t => t.key === activeTab).table
    await supabase.from(table).delete().eq('id', id)
    loadAll()
  }

  const current = requests[activeTab]
  const filtered = current.filter(r => filter === 'all' || r.status === filter)
  const counts = {
    all: current.length,
    pending: current.filter(r => r.status === 'pending').length,
    approved: current.filter(r => r.status === 'approved').length,
    declined: current.filter(r => r.status === 'declined').length,
  }

  const tabLabels = { artist: 'Artist Requests', rerate: 'Re-Rate Requests', site: 'Site Requests' }
  const buttonLabels = { artist: 'Request Artist', rerate: 'Request Re-Rate', site: 'Submit Request' }
  const emptyLabels = { artist: 'request an artist', rerate: 'request a re-rate', site: 'submit a site request' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Requests</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {isAdmin ? 'Manage requests from users' : 'Submit requests for the collection and site'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          {buttonLabels[activeTab]}
        </button>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 flex-wrap border-b border-zinc-800 pb-4">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setFilter('all') }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800/60 text-zinc-400 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === key ? 'bg-white/20' : 'bg-zinc-700'}`}>
              {requests[key].length}
            </span>
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'approved', 'declined'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize flex items-center gap-1.5 ${
              filter === f ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {f}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/20' : 'bg-zinc-700'}`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-zinc-600">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <p>No {filter === 'all' ? '' : filter} requests yet</p>
          {filter === 'all' && (
            <button onClick={() => setShowForm(true)} className="mt-3 text-violet-400 hover:text-violet-300 text-sm">
              Be the first to {emptyLabels[activeTab]}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <RequestCard
              key={req.id}
              req={req}
              tab={activeTab}
              isAdmin={isAdmin}
              onStatus={updateStatus}
              onDelete={deleteRequest}
            />
          ))}
        </div>
      )}

      {/* Forms */}
      {showForm && activeTab === 'artist' && (
        <ArtistForm user={user} profile={profile}
          onSubmit={() => { setShowForm(false); loadAll() }}
          onClose={() => setShowForm(false)} />
      )}
      {showForm && activeTab === 'rerate' && (
        <RerateForm user={user} profile={profile}
          onSubmit={() => { setShowForm(false); loadAll() }}
          onClose={() => setShowForm(false)} />
      )}
      {showForm && activeTab === 'site' && (
        <SiteForm user={user} profile={profile}
          onSubmit={() => { setShowForm(false); loadAll() }}
          onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}
