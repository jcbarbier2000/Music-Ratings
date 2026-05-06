import React, { useState } from 'react'
import { Upload, X, Image } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ImageUpload({ bucket, existingUrl, onUpload, label = 'Image' }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(existingUrl || null)
  const [error, setError] = useState('')

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate type and size
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB')
      return
    }

    setError('')
    setUploading(true)

    try {
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filename, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from(bucket).getPublicUrl(filename)
      setPreview(data.publicUrl)
      onUpload(data.publicUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const clear = () => {
    setPreview(null)
    onUpload(null)
  }

  return (
    <div>
      <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">{label}</label>
      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="w-24 h-24 object-cover rounded-xl border border-zinc-700"
          />
          <button
            onClick={clear}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-3 w-full px-4 py-3 bg-zinc-800 border border-dashed border-zinc-600 hover:border-violet-500 text-zinc-400 hover:text-violet-400 rounded-xl cursor-pointer transition-colors">
          {uploading ? (
            <span className="text-sm">Uploading...</span>
          ) : (
            <>
              <Upload className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Upload {label}</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
