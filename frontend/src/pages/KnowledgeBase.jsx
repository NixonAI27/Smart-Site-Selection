import { useEffect, useState } from 'react'
import api from '../api/client'

export default function KnowledgeBase() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)

  const load = () => api.get('/knowledge').then(({ data }) => { setDocs(data); setLoading(false) })

  useEffect(() => { load() }, [])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setUploadStatus(null)
    const form = new FormData()
    form.append('file', file)
    form.append('project_type', 'residential')
    form.append('total_value', '0')
    try {
      await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: form,
      }).then((r) => { if (!r.ok) throw new Error('Upload failed'); return r.json() })
      setUploadStatus({ ok: true, msg: `${file.name} added to knowledge base.` })
      load()
    } catch {
      setUploadStatus({ ok: false, msg: 'Upload failed. Please try again.' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const deleteDoc = async (id) => {
    await api.delete(`/knowledge/${id}`)
    setDocs(docs.filter((d) => d.id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--dark-green)' }}>Knowledge Base</h1>
          <p className="text-stone-500 text-sm mt-1">Past estimates and tenders used for RAG-assisted pricing</p>
        </div>
        <label className={`px-4 py-2 rounded-lg text-white font-semibold text-sm shadow cursor-pointer ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
          style={{ backgroundColor: 'var(--dark-green)' }}>
          {uploading ? 'Uploading…' : '+ Upload Document'}
          <input type="file" accept=".pdf,.docx,.xlsx,.xls,.dxf,.jpg,.jpeg,.png" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {uploadStatus && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${uploadStatus.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {uploadStatus.msg}
        </div>
      )}

      {loading ? (
        <p className="text-stone-400">Loading…</p>
      ) : docs.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <p className="text-4xl mb-3">📂</p>
          <p>No documents yet. Upload past estimates and tenders to enable RAG-assisted pricing.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white text-xs" style={{ backgroundColor: 'var(--dark-green)' }}>
                <th className="px-4 py-2 text-left">Filename</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Uploaded</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc, i) => (
                <tr key={doc.id} className={`border-t border-stone-100 ${i % 2 === 1 ? 'bg-stone-50' : 'bg-white'}`}>
                  <td className="px-4 py-2.5 text-stone-800">{doc.filename}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">{doc.file_type}</span>
                  </td>
                  <td className="px-4 py-2.5 text-stone-500">{doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => deleteDoc(doc.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
