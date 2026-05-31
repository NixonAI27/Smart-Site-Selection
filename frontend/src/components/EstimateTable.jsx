import { useState } from 'react'
import api from '../api/client'

const CATEGORIES = ['trim', 'millwork', 'cabinetry', 'hardware', 'labor', 'other']
const UNITS = ['lf', 'sf', 'ea', 'hr', 'set', 'allow']

export default function EstimateTable({ estimate, onUpdate }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [addForm, setAddForm] = useState({ category: 'trim', description: '', quantity: 1, unit: 'lf', unit_cost: 0 })
  const [showAdd, setShowAdd] = useState(false)

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditForm({ ...item })
  }

  const saveEdit = async () => {
    setSaving(true)
    const { data } = await api.patch(`/estimates/${estimate.id}/items/${editingId}`, editForm)
    onUpdate({ ...estimate, line_items: estimate.line_items.map((i) => i.id === editingId ? data : i) })
    // refresh full estimate to get updated totals
    const { data: updated } = await api.get(`/estimates/${estimate.id}`)
    onUpdate(updated)
    setEditingId(null)
    setSaving(false)
  }

  const deleteItem = async (itemId) => {
    await api.delete(`/estimates/${estimate.id}/items/${itemId}`)
    const { data: updated } = await api.get(`/estimates/${estimate.id}`)
    onUpdate(updated)
  }

  const addItem = async () => {
    setSaving(true)
    await api.post(`/estimates/${estimate.id}/items`, addForm)
    const { data: updated } = await api.get(`/estimates/${estimate.id}`)
    onUpdate(updated)
    setAddForm({ category: 'trim', description: '', quantity: 1, unit: 'lf', unit_cost: 0 })
    setShowAdd(false)
    setSaving(false)
  }

  const items = estimate.line_items || []

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-stone-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white text-xs" style={{ backgroundColor: 'var(--dark-green)' }}>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-left">Unit</th>
              <th className="px-3 py-2 text-right">Unit Cost</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className={`border-t border-stone-100 ${idx % 2 === 1 ? 'bg-stone-50' : 'bg-white'}`}>
                {editingId === item.id ? (
                  <>
                    <td className="px-2 py-1">
                      <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="border border-stone-300 rounded px-1 py-0.5 text-xs w-full">
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="border border-stone-300 rounded px-1 py-0.5 text-xs w-full" />
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                        className="border border-stone-300 rounded px-1 py-0.5 text-xs w-16 text-right" />
                    </td>
                    <td className="px-2 py-1">
                      <select value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                        className="border border-stone-300 rounded px-1 py-0.5 text-xs w-full">
                        {UNITS.map((u) => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" value={editForm.unit_cost} onChange={(e) => setEditForm({ ...editForm, unit_cost: Number(e.target.value) })}
                        className="border border-stone-300 rounded px-1 py-0.5 text-xs w-20 text-right" step="0.01" />
                    </td>
                    <td className="px-2 py-1 text-right text-xs text-stone-500">
                      ${(editForm.quantity * editForm.unit_cost).toFixed(2)}
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex gap-1">
                        <button onClick={saveEdit} disabled={saving} className="text-xs text-green-700 hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-stone-500 hover:underline">Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2">
                      <span className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">{item.category}</span>
                      {item.ai_generated && <span className="ml-1 text-xs text-amber-500" title="AI generated">✦</span>}
                    </td>
                    <td className="px-3 py-2 text-stone-800">{item.description}</td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-stone-500">{item.unit}</td>
                    <td className="px-3 py-2 text-right">${item.unit_cost.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-medium">${item.total_cost.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(item)} className="text-xs text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => deleteItem(item.id)} className="text-xs text-red-500 hover:underline">Del</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 text-sm">
        <div className="flex justify-between text-stone-600 mb-1">
          <span>Labor</span><span>${estimate.total_labor?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-stone-600 mb-1">
          <span>Materials</span><span>${estimate.total_materials?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-stone-500 mb-2">
          <span>Markup ({estimate.markup_pct}%)</span><span>—</span>
        </div>
        <div className="flex justify-between font-bold text-base border-t border-stone-300 pt-2" style={{ color: 'var(--dark-green)' }}>
          <span>Grand Total</span><span>${estimate.grand_total?.toFixed(2)}</span>
        </div>
      </div>

      {/* Add item */}
      {showAdd ? (
        <div className="bg-white rounded-xl p-4 border border-stone-200 flex flex-col gap-2">
          <h4 className="text-sm font-semibold text-stone-700">Add Line Item</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-stone-500">Category</label>
              <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                className="w-full border border-stone-300 rounded px-2 py-1 text-sm mt-0.5">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500">Unit</label>
              <select value={addForm.unit} onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                className="w-full border border-stone-300 rounded px-2 py-1 text-sm mt-0.5">
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-500">Description</label>
            <input value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              className="w-full border border-stone-300 rounded px-2 py-1 text-sm mt-0.5" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-stone-500">Quantity</label>
              <input type="number" value={addForm.quantity} onChange={(e) => setAddForm({ ...addForm, quantity: Number(e.target.value) })}
                className="w-full border border-stone-300 rounded px-2 py-1 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-stone-500">Unit Cost ($)</label>
              <input type="number" value={addForm.unit_cost} onChange={(e) => setAddForm({ ...addForm, unit_cost: Number(e.target.value) })}
                step="0.01" className="w-full border border-stone-300 rounded px-2 py-1 text-sm mt-0.5" />
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            <button onClick={() => setShowAdd(false)} className="flex-1 py-1.5 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
            <button onClick={addItem} disabled={saving || !addForm.description} className="flex-1 py-1.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--dark-green)' }}>
              Add
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} className="text-sm text-stone-500 hover:text-stone-900 border-2 border-dashed border-stone-300 rounded-xl py-3 hover:border-stone-400 transition-colors">
          + Add line item
        </button>
      )}
    </div>
  )
}
