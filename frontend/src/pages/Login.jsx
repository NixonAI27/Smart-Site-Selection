import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import api from '../api/client'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const form = new FormData()
      form.append('username', username)
      form.append('password', password)
      const { data } = await api.post('/auth/token', form)
      login(data.access_token)
      navigate('/')
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cream)' }}>
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--dark-green)' }}>
          🪵 CarpentryEst
        </h1>
        <p className="text-stone-500 text-sm mb-8">Finish Carpentry Estimating Tool</p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Username</label>
            <input
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="py-2 rounded-lg text-white font-semibold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: 'var(--dark-green)' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-xs text-stone-400 mt-6 text-center">Default dev credentials: estimator / secret</p>
      </div>
    </div>
  )
}
