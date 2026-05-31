import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

function NewProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', client: '', address: '', description: '' })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { data } = await api.post('/projects', form)
    onCreate(data)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-xl font-bold mb-5" style={{ color: 'var(--dark-green)' }}>New Project</h2>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {[['name', 'Project Name *'], ['client', 'Client'], ['address', 'Address']].map(([field, label]) => (
            <div key={field}>
              <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
              <input
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                required={field === 'name'}
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
            <textarea
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-white font-semibold text-sm disabled:opacity-60"
              style={{ backgroundColor: 'var(--dark-green)' }}
            >
              {loading ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/projects').then(({ data }) => {
      setProjects(data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--dark-green)' }}>Projects</h1>
          <p className="text-stone-500 text-sm mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-lg text-white font-semibold text-sm shadow"
          style={{ backgroundColor: 'var(--dark-green)' }}
        >
          + New Project
        </button>
      </div>

      {loading ? (
        <p className="text-stone-400">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <p className="text-4xl mb-3">🪵</p>
          <p className="text-lg">No projects yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="bg-white rounded-xl p-5 shadow-sm border border-stone-100 cursor-pointer hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-stone-900 mb-1">{p.name}</h3>
              {p.client && <p className="text-sm text-stone-500">Client: {p.client}</p>}
              {p.address && <p className="text-xs text-stone-400 mt-1">{p.address}</p>}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
                <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: 'var(--light-green)' }}>
                  {p.estimate_count} estimate{p.estimate_count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreate={(p) => setProjects([p, ...projects])}
        />
      )}
    </div>
  )
}
