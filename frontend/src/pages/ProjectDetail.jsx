import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [estimates, setEstimates] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/estimates/project/${id}`),
    ]).then(([p, e]) => {
      setProject(p.data)
      setEstimates(e.data)
      setLoading(false)
    })
  }, [id])

  const createEstimate = async () => {
    setCreating(true)
    const { data } = await api.post('/estimates', { project_id: Number(id) })
    navigate(`/estimates/${data.id}`)
  }

  if (loading) return <div className="p-8 text-stone-400">Loading…</div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <button onClick={() => navigate('/')} className="text-sm text-stone-500 hover:text-stone-900 mb-4">
        ← Back to Dashboard
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--dark-green)' }}>{project.name}</h1>
          {project.client && <p className="text-stone-500 text-sm mt-0.5">Client: {project.client}</p>}
          {project.address && <p className="text-stone-400 text-xs mt-0.5">{project.address}</p>}
          {project.description && <p className="text-stone-600 text-sm mt-2 max-w-lg">{project.description}</p>}
        </div>
        <button
          onClick={createEstimate}
          disabled={creating}
          className="px-4 py-2 rounded-lg text-white font-semibold text-sm shadow disabled:opacity-60"
          style={{ backgroundColor: 'var(--dark-green)' }}
        >
          {creating ? 'Creating…' : '+ New Estimate'}
        </button>
      </div>

      <h2 className="text-lg font-semibold text-stone-800 mb-3">Estimates</h2>
      {estimates.length === 0 ? (
        <p className="text-stone-400 py-10 text-center">No estimates yet — create one to get started.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {estimates.map((e) => (
            <div
              key={e.id}
              onClick={() => navigate(`/estimates/${e.id}`)}
              className="bg-white rounded-xl p-5 shadow-sm border border-stone-100 cursor-pointer hover:shadow-md transition-shadow flex items-center justify-between"
            >
              <div>
                <span className="font-semibold text-stone-900">Version {e.version}</span>
                <span className={`ml-3 text-xs px-2 py-0.5 rounded-full font-medium ${e.status === 'final' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {e.status}
                </span>
                <p className="text-sm text-stone-500 mt-1">{e.line_items?.length || 0} line items</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: 'var(--dark-green)' }}>
                  ${(e.grand_total || 0).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-stone-400">{new Date(e.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
