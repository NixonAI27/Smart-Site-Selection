import { useState } from 'react'

const CATEGORY_COLORS = {
  trim: 'bg-amber-100 text-amber-800',
  millwork: 'bg-blue-100 text-blue-800',
  cabinetry: 'bg-purple-100 text-purple-800',
  hardware: 'bg-orange-100 text-orange-800',
  labor: 'bg-green-100 text-green-700',
  other: 'bg-stone-100 text-stone-700',
}

export default function AiAnalysisPanel({ scope, ragSuggestions, onConfirmItems }) {
  const [selected, setSelected] = useState(() =>
    new Set((scope?.scope_items || []).map((_, i) => i))
  )

  const items = scope?.scope_items || []
  const rooms = scope?.rooms || []
  const materials = scope?.materials || []
  const notes = scope?.notes || []

  const toggleItem = (i) => {
    const next = new Set(selected)
    next.has(i) ? next.delete(i) : next.add(i)
    setSelected(next)
  }

  const getSuggestion = (description) => {
    if (!ragSuggestions?.length) return null
    return ragSuggestions.find(
      (s) => s.description?.toLowerCase().includes(description?.toLowerCase().slice(0, 10))
    )
  }

  const confirmSelected = () => {
    const confirmed = items
      .filter((_, i) => selected.has(i))
      .map((item) => {
        const sug = getSuggestion(item.description)
        return {
          ...item,
          unit_cost: sug?.suggested_unit_cost || 0,
          total_cost: item.quantity * (sug?.suggested_unit_cost || 0),
          ai_generated: true,
        }
      })
    onConfirmItems(confirmed)
  }

  if (!scope) return null

  return (
    <div className="flex flex-col gap-4">
      {rooms.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-700 mb-2">Rooms Identified</h3>
          <div className="flex flex-wrap gap-2">
            {rooms.map((r, i) => (
              <span key={i} className="text-xs bg-stone-100 text-stone-700 px-2 py-1 rounded-full">
                {r.name}{r.length_ft && r.width_ft ? ` (${r.length_ft}′×${r.width_ft}′)` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-stone-700">Scope Items ({selected.size}/{items.length} selected)</h3>
            <div className="flex gap-2">
              <button onClick={() => setSelected(new Set(items.map((_, i) => i)))} className="text-xs text-stone-500 hover:underline">All</button>
              <button onClick={() => setSelected(new Set())} className="text-xs text-stone-500 hover:underline">None</button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1">
            {items.map((item, i) => {
              const sug = getSuggestion(item.description)
              return (
                <label
                  key={i}
                  className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer border transition-colors ${
                    selected.has(i) ? 'border-green-300 bg-green-50' : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggleItem(i)}
                    className="mt-0.5 accent-green-700"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other}`}>
                        {item.category}
                      </span>
                      <span className="text-sm text-stone-800 font-medium">{item.description}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {item.quantity} {item.unit}
                      {sug && (
                        <span className="ml-2 text-amber-700">
                          ~${sug.suggested_unit_cost?.toFixed(2)}/{item.unit}
                          <span className="ml-1 text-stone-400">({sug.confidence} confidence)</span>
                        </span>
                      )}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
          <button
            onClick={confirmSelected}
            disabled={selected.size === 0}
            className="mt-3 w-full py-2 rounded-lg text-white font-semibold text-sm disabled:opacity-40"
            style={{ backgroundColor: 'var(--dark-green)' }}
          >
            Add {selected.size} Item{selected.size !== 1 ? 's' : ''} to Estimate
          </button>
        </div>
      )}

      {materials.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-700 mb-1">Material Specs</h3>
          <ul className="text-xs text-stone-600 list-disc list-inside space-y-0.5">
            {materials.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {notes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-700 mb-1">Notes</h3>
          <ul className="text-xs text-stone-500 list-disc list-inside space-y-0.5">
            {notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
