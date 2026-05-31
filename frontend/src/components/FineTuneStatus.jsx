import { useEffect, useState } from 'react'
import api from '../api/client'

const STATUS_COLORS = {
  pending: 'text-yellow-600 bg-yellow-50',
  running: 'text-blue-600 bg-blue-50',
  succeeded: 'text-green-700 bg-green-50',
  failed: 'text-red-600 bg-red-50',
}

export default function FineTuneStatus({ job, onActivate, onRefresh }) {
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    if (job.status === 'running' || job.status === 'pending') {
      const interval = setInterval(() => {
        onRefresh(job.id)
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [job.status, job.id, onRefresh])

  const handleActivate = async () => {
    setPolling(true)
    await api.post(`/finetuning/activate/${job.id}`)
    setPolling(false)
    onActivate()
  }

  const handleRefresh = async () => {
    setPolling(true)
    await onRefresh(job.id)
    setPolling(false)
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-stone-800">Fine-Tune Job #{job.id}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status] || STATUS_COLORS.pending}`}>
          {job.status}
        </span>
      </div>
      <p className="text-xs text-stone-500">Trained on {job.training_doc_count} estimate{job.training_doc_count !== 1 ? 's' : ''}</p>
      {job.fine_tuned_model_id && (
        <p className="text-xs text-stone-500 mt-0.5 font-mono">{job.fine_tuned_model_id}</p>
      )}
      <p className="text-xs text-stone-400 mt-0.5">Submitted {new Date(job.created_at).toLocaleString()}</p>

      <div className="flex gap-2 mt-3">
        {(job.status === 'running' || job.status === 'pending') && (
          <button onClick={handleRefresh} disabled={polling} className="text-xs text-blue-600 hover:underline disabled:opacity-50">
            {polling ? 'Checking…' : 'Refresh status'}
          </button>
        )}
        {job.status === 'succeeded' && (
          <button onClick={handleActivate} disabled={polling} className="text-xs px-2 py-1 rounded bg-green-700 text-white hover:bg-green-800 disabled:opacity-50">
            {polling ? 'Activating…' : 'Activate this model'}
          </button>
        )}
      </div>
    </div>
  )
}
