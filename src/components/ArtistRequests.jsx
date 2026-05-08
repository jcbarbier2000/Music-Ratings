import React, { useState, useEffect } from 'react'
import { Plus, X, Check, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ArtistRequests({ isAdmin, user, profile }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [artistName, setArtistName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'approved' | 'declined'

  useEffect(() => { loadRequests() }, [])

  const loadRequests = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('artist_requests')
      .select('*')
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  const submitRequest = async () => {
    setError('')
    if (!artistName.trim()) { setError('Please enter an artist name'); return }

    // Check for duplicate pending request
    const existing = requests.find(r =>
      r.artist_name.toLowerCase() === artistName.trim().toLowerCase() &&
      r.status === 'pending'
    )
    if (existing) { setError('This artist has already been requested'); return }

    setSaving(true)
    const { error: err } = await supabase.from('artist_requests').insert({
      requested_by: user.id,
      username: profile.username,
      artist_name: artistName.trim(),
      notes: notes.trim() || null,
    })
    if (err) { setError(err.message); setSaving(false); return }

    setArtistName('')
    setNotes('')
    setShowForm(false)
    setSaving(false)
    loadRequests()
  }

  const updateStatus = async (id, status) => {
    await supabase.from('artist_requests').update({ status }).eq('id', id)
    loadRequests()
  }

  const deleteRequest = async (id) => {
    if (!confirm('Delete this request?')) return
    await supabase.from('artist_requests').delete().eq('id', id)
    loadRequests()
  }

  const filtered = requests.filter(r => filter === 'all' || r.status === filter)

  const statusIcon = (status) => {
    if (status === 'pending') return <Clock className="w-3.5 h-3.5 text-amber-400" />
    if (status === 'approved') return <CheckCircle className="w-3.5 h-3.5 text-green-400" />
    return <XCircle className="w-3.5 h-3.5 text-red-400" />
  }

  const statusLabel = (status) => {
    if (status === 'pending') return 'text-amber-400 bg-amber-950/50 border-amber-800/50'
    if (status === 'approved') return 'text-green-400 bg-green-950/50 border-green-800/50'
    return 'text-red-400 bg-red-950/50 border-red-800/50'
  }

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    declined: requests.filter(r => r.status === 'declined').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Artist Requests</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {isAdmin ? 'Manage requests from users' : 'Request an artist to be added to the collection'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Request Artist
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'approved', 'declined'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize flex items-center gap-1.5 ${
              filter === f
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {f}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/20' : 'bg-zinc-700'}`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Requests list */}
      {loading ? (
        <div className="text-center py-16 text-zinc-600">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <p>No {filter === 'all' ? '' : filter} requests yet</p>
          {filter === 'all' && (
            <button onClick={() => setShowForm(true)} className="mt-3 text-violet-400 hover:text-violet-300 text-sm">
              Be the first to request an artist
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <div key={req.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-white text-lg">{req.artist_name}</h3>
                    <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${statusLabel(req.status)}`}>
                      {statusIcon(req.status)}
                      {req.status}
                    </span>
                  </div>
                  {req.notes && (
                    <p className="text-sm text-zinc-400 mt-1.5">{req.notes}</p>
                  )}
                  <p className="text-xs text-zinc-600 mt-2">
                    Requested by <span className="text-zinc-500">{req.username}</span> · {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Admin actions */}
                  {isAdmin && req.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateStatus(req.id, 'approved')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/50 hover:bg-green-800/60 text-green-400 text-xs font-medium rounded-lg border border-green-800/50 transition-colors"
                        title="Approve"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => updateStatus(req.id, 'declined')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/50 hover:bg-red-900/60 text-red-400 text-xs font-medium rounded-lg border border-red-800/50 transition-colors"
                        title="Decline"
                      >
                        <X className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => deleteRequest(req.id)}
                      className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Request an Artist</h2>
              <button onClick={() => { setShowForm(false); setError(''); setArtistName(''); setNotes('') }}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Artist Name</label>
                <input
                  value={artistName}
                  onChange={e => setArtistName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitRequest()}
                  placeholder="e.g. Radiohead"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Notes <span className="text-zinc-600 normal-case tracking-normal">(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Why should this artist be added? Any specific albums?"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none text-sm"
                />
              </div>
              {error && (
                <div className="bg-red-950/50 border border-red-800/60 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={submitRequest} disabled={saving}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                  {saving ? 'Submitting...' : 'Submit Request'}
                </button>
                <button onClick={() => { setShowForm(false); setError(''); setArtistName(''); setNotes('') }}
                  className="px-6 py-3 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
