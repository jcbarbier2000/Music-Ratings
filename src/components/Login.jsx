import React, { useState } from 'react'
import { Music } from 'lucide-react'

export default function Login({ onSignIn, onSignUp, onResetPassword }) {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setError('')
    setSuccess('')
    setUsername('')
    setEmail('')
    setPassword('')
  }

  const switchMode = (newMode) => {
    reset()
    setMode(newMode)
  }

  const handleLogin = async () => {
    setError('')
    if (!email.trim()) { setError('Please enter your email'); return }
    if (!password) { setError('Please enter your password'); return }
    setLoading(true)
    try {
      await onSignIn(email.trim(), password)
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setError('')
    if (!username.trim() || username.trim().length < 3) {
      setError('Username must be at least 3 characters')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await onSignUp(username.trim(), email.trim(), password)
      setSuccess('Account created! You can now log in.')
      switchMode('login')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async () => {
    setError('')
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter your email address')
      return
    }
    setLoading(true)
    try {
      await onResetPassword(email.trim())
      setSuccess('Password reset email sent! Check your inbox.')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handle = mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleForgot

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 mb-5 shadow-lg shadow-violet-900/40">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Music Ratings</h1>
          <p className="text-zinc-500 mt-2 text-sm">
            {mode === 'login' && 'Welcome back'}
            {mode === 'register' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
          </p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 backdrop-blur">
          <div className="space-y-4">

            {/* Username — register only */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-widest mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handle()}
                  placeholder="e.g. james"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handle()}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Password — login and register only */}
            {mode !== 'forgot' && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-widest mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handle()}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            {/* Forgot password link */}
            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  onClick={() => switchMode('forgot')}
                  className="text-xs text-zinc-500 hover:text-violet-400 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Error / success */}
            {error && (
              <div className="bg-red-950/50 border border-red-800/60 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-950/50 border border-green-800/60 text-green-400 px-4 py-3 rounded-xl text-sm">
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handle}
              disabled={loading}
              className="w-full py-3 px-6 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Login' : mode === 'register' ? 'Create Account' : 'Send Reset Email'}
            </button>

            {/* Mode switchers */}
            <div className="text-center space-y-2 pt-2">
              {mode === 'login' && (
                <button onClick={() => switchMode('register')}
                  className="block w-full text-sm text-zinc-500 hover:text-violet-400 transition-colors">
                  Don't have an account? Register
                </button>
              )}
              {mode === 'register' && (
                <button onClick={() => switchMode('login')}
                  className="block w-full text-sm text-zinc-500 hover:text-violet-400 transition-colors">
                  Already have an account? Login
                </button>
              )}
              {mode === 'forgot' && (
                <button onClick={() => switchMode('login')}
                  className="block w-full text-sm text-zinc-500 hover:text-violet-400 transition-colors">
                  Back to login
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-700 mt-6">
          Admin access is granted by the site owner
        </p>
      </div>
    </div>
  )
}
