import { useEffect, useState, useCallback } from 'react'
import api from '../api/client'
import FineTuneStatus from '../components/FineTuneStatus'

export default function ModelSettings() {
  const [settings, setSettings] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState(null)

  const loadAll = async () => {
    const [s, j] = await Promise.all([api.get('/finetuning/settings'), api.get('/finetuning/jobs')])
    setSettings(s.data)
    setJobs(j.data)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const submitJob = async () => {
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const { data } = await api.post('/finetuning/submit')
      setSubmitMsg({ ok: true, msg: `Fine-tune job submitted (Anthropic ID: ${data.anthropic_job_id})` })
      await loadAll()
    } catch (e) {
      setSubmitMsg({ ok: false, msg: e.response?.data?.detail || 'Submission failed.' })
    } finally {
      setSubmitting(false)
    }
  }

  const refreshJob = useCallback(async (jobId) => {
    const { data } = await api.get(`/finetuning/status/${jobId}`)
    setJobs((prev) => prev.map((j) => j.id === jobId ? data : j))
  }, [])

  const onActivate = () => loadAll()

  const deactivate = async () => {
    await api.post('/finetuning/deactivate')
    loadAll()
  }

  if (loading) return <div className="p-8 text-stone-400">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--dark-green)' }}>Model Settings</h1>
      <p className="text-stone-500 text-sm mb-8">Train a custom model on your portfolio of estimates to improve pricing accuracy.</p>

      {/* Active model */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-stone-700 mb-3">Active Model</h2>
        {settings?.active_model ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-700 font-medium mb-0.5">✅ Fine-tuned model active</p>
              <p className="text-xs font-mono text-stone-600">{settings.active_model}</p>
            </div>
            <button onClick={deactivate} className="text-xs text-stone-500 hover:text-red-600 border border-stone-300 rounded px-2 py-1">
              Revert to base model
            </button>
          </div>
        ) : (
          <p className="text-sm text-stone-500">
            Using base model <span className="font-mono text-stone-700">claude-opus-4-8</span>
          </p>
        )}
      </div>

      {/* Training corpus */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-stone-700 mb-2">Training Corpus</h2>
        <p className="text-stone-600 text-sm">
          <span className="font-bold text-2xl" style={{ color: 'var(--dark-green)' }}>{settings?.finalized_estimate_count || 0}</span>
          {' '}finalized estimate{settings?.finalized_estimate_count !== 1 ? 's' : ''} available for training.
        </p>
        <p className="text-xs text-stone-400 mt-1">
          Only <strong>finalized</strong> estimates are included. Mark estimates as final in the Estimate Workspace.
        </p>

        {submitMsg && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${submitMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {submitMsg.msg}
          </div>
        )}

        <button
          onClick={submitJob}
          disabled={submitting || (settings?.finalized_estimate_count || 0) === 0}
          className="mt-4 px-5 py-2 rounded-lg text-white font-semibold text-sm shadow disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent-gold)' }}
        >
          {submitting ? 'Submitting…' : '🚀 Submit Fine-Tune Job'}
        </button>
        {(settings?.finalized_estimate_count || 0) === 0 && (
          <p className="text-xs text-stone-400 mt-2">Finalize at least one estimate first.</p>
        )}
      </div>

      {/* Job history */}
      <div>
        <h2 className="text-sm font-semibold text-stone-700 mb-3">Job History</h2>
        {jobs.length === 0 ? (
          <p className="text-stone-400 text-sm">No fine-tuning jobs yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <FineTuneStatus
                key={job.id}
                job={job}
                onActivate={onActivate}
                onRefresh={refreshJob}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
