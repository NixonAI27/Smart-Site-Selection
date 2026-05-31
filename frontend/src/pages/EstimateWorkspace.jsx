import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import DocumentUploader from '../components/DocumentUploader'
import AiAnalysisPanel from '../components/AiAnalysisPanel'
import EstimateTable from '../components/EstimateTable'

export default function EstimateWorkspace() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [estimate, setEstimate] = useState(null)
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState(null)
  const [ragSuggestions, setRagSuggestions] = useState([])
  const [markupInput, setMarkupInput] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  useEffect(() => {
    api.get(`/estimates/${id}`).then(({ data }) => {
      setEstimate(data)
      setMarkupInput(String(data.markup_pct))
      return api.get(`/projects/${data.project_id}`)
    }).then(({ data }) => {
      setProject(data)
      setLoading(false)
    })
  }, [id])

  const handleUploadComplete = ({ scope: s, rag_suggestions: rag }) => {
    setScope(s)
    setRagSuggestions(rag || [])
  }

  const handleConfirmItems = async (items) => {
    for (const item of items) {
      await api.post(`/estimates/${id}/items`, {
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_cost: item.unit_cost || 0,
        ai_generated: true,
      })
    }
    const { data: updated } = await api.get(`/estimates/${id}`)
    setEstimate(updated)
    setScope(null)
  }

  const saveMarkup = async () => {
    const { data } = await api.patch(`/estimates/${id}`, { markup_pct: Number(markupInput) })
    setEstimate(data)
  }

  const setStatus = async (status) => {
    setSavingStatus(true)
    const { data } = await api.patch(`/estimates/${id}`, { status })
    setEstimate(data)
    setSavingStatus(false)
  }

  const exportEstimate = (format) => {
    window.open(`/api/estimates/${id}/export?format=${format}`, '_blank')
  }

  if (loading) return <div className="p-8 text-stone-400">Loading…</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <button onClick={() => navigate(`/projects/${estimate.project_id}`)} className="text-sm text-stone-500 hover:text-stone-900 mb-1 block">
            ← {project?.name}
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--dark-green)' }}>
            Estimate v{estimate.version}
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium align-middle ${estimate.status === 'final' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {estimate.status}
            </span>
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => exportEstimate('pdf')} className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
            Export PDF
          </button>
          <button onClick={() => exportEstimate('xlsx')} className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
            Export Excel
          </button>
          {estimate.status === 'draft' ? (
            <button onClick={() => setStatus('final')} disabled={savingStatus} className="px-3 py-1.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: 'var(--dark-green)' }}>
              Mark Final
            </button>
          ) : (
            <button onClick={() => setStatus('draft')} disabled={savingStatus} className="px-3 py-1.5 rounded-lg text-sm border border-stone-400 text-stone-600 hover:bg-stone-50 disabled:opacity-50">
              Revert to Draft
            </button>
          )}
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Col 1: Upload + Markup */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <h2 className="text-sm font-semibold text-stone-700 mb-3">Upload Document</h2>
            <DocumentUploader
              onUploadComplete={handleUploadComplete}
              projectDescription={project?.description || ''}
            />
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <h2 className="text-sm font-semibold text-stone-700 mb-3">Markup</h2>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={markupInput}
                onChange={(e) => setMarkupInput(e.target.value)}
                className="w-20 border border-stone-300 rounded-lg px-2 py-1 text-sm text-center"
                min={0} max={100} step={0.5}
              />
              <span className="text-sm text-stone-500">%</span>
              <button onClick={saveMarkup} className="px-3 py-1 rounded-lg text-white text-xs font-medium" style={{ backgroundColor: 'var(--accent-gold)' }}>
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Col 2: AI Analysis */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">AI Analysis</h2>
          {scope ? (
            <AiAnalysisPanel
              scope={scope}
              ragSuggestions={ragSuggestions}
              onConfirmItems={handleConfirmItems}
            />
          ) : (
            <p className="text-sm text-stone-400 text-center py-12">
              Upload a document to extract carpentry scope
            </p>
          )}
        </div>

        {/* Col 3: Estimate Table */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">
            Line Items ({estimate.line_items?.length || 0})
          </h2>
          <EstimateTable estimate={estimate} onUpdate={setEstimate} />
        </div>
      </div>
    </div>
  )
}
