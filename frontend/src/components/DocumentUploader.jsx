import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/dxf': ['.dxf'],
  'application/octet-stream': ['.dxf'],
}

export default function DocumentUploader({ onUploadComplete, projectDescription = '' }) {
  const [status, setStatus] = useState(null) // null | 'uploading' | 'done' | 'error'
  const [message, setMessage] = useState('')

  const onDrop = useCallback(async (accepted) => {
    if (!accepted.length) return
    setStatus('uploading')
    setMessage(`Uploading & analyzing ${accepted[0].name}…`)

    const formData = new FormData()
    formData.append('file', accepted[0])
    formData.append('project_description', projectDescription)

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Upload failed')
      }
      const data = await res.json()
      setStatus('done')
      setMessage(`Analysis complete for ${data.filename}`)
      onUploadComplete(data)
    } catch (e) {
      setStatus('error')
      setMessage(e.message)
    }
  }, [projectDescription, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    multiple: false,
    disabled: status === 'uploading',
  })

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-green-700 bg-green-50' : 'border-stone-300 hover:border-green-600 hover:bg-stone-50'
        } ${status === 'uploading' ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <p className="text-stone-500 text-sm">
          {isDragActive ? 'Drop it here…' : 'Drag & drop a file, or click to browse'}
        </p>
        <p className="text-xs text-stone-400 mt-1">PDF · Word · Excel · DXF · JPG/PNG</p>
      </div>
      {status && (
        <p className={`text-xs mt-2 ${status === 'error' ? 'text-red-600' : status === 'done' ? 'text-green-700' : 'text-stone-500'}`}>
          {status === 'uploading' && '⏳ '}{status === 'done' && '✅ '}{status === 'error' && '❌ '}{message}
        </p>
      )}
    </div>
  )
}
