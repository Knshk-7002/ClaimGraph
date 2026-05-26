import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, AlertCircle } from 'lucide-react'
import { wouldCreateCycle } from '../engine/graph'

export default function AddForms({ graphData, onUpdateGraph }) {
  const [activeForm, setActiveForm] = useState(null)
  const [error, setError] = useState('')

  const toggle = (form) => {
    setActiveForm(activeForm === form ? null : form)
    setError('')
  }

  const addClaim = (e) => {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.target)
    const text = fd.get('text')?.trim()
    if (!text) { setError('Claim text is required'); return }
    const id = fd.get('id')?.trim() || `c_${Date.now().toString(36)}`
    if (graphData.claims.find(c => c.id === id)) { setError('Claim ID already exists'); return }
    const tags = (fd.get('tags') || '').split(',').map(s => s.trim()).filter(Boolean)
    const context = fd.get('context') || ''
    const newClaims = [...graphData.claims, { id, text, tags, context }]
    onUpdateGraph({ ...graphData, claims: newClaims })
    e.target.reset()
    setActiveForm(null)
  }

  const addEvidence = (e) => {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.target)
    const claimId = fd.get('claim_id')
    if (!claimId) { setError('Select a claim'); return }
    const ev = {
      id: `e_${Date.now().toString(36)}`,
      claim_id: claimId,
      source: fd.get('source'),
      direction: fd.get('direction'),
      strength: parseFloat(fd.get('strength')),
      source_quality: parseFloat(fd.get('source_quality')),
      notes: fd.get('notes') || '',
    }
    onUpdateGraph({ ...graphData, evidence: [...graphData.evidence, ev] })
    e.target.reset()
    setActiveForm(null)
  }

  const addEdge = (e) => {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.target)
    const source = fd.get('source')
    const target = fd.get('target')
    const type = fd.get('type')
    if (source === target) { setError('Source and target must differ'); return }
    if (type === 'depends_on' && wouldCreateCycle(graphData.claims, graphData.edges, source, target)) {
      setError('This edge would create a cycle in the dependency DAG!')
      return
    }
    const edge = {
      source,
      target,
      type,
      weight: parseFloat(fd.get('weight')),
      notes: '',
    }
    onUpdateGraph({ ...graphData, edges: [...graphData.edges, edge] })
    e.target.reset()
    setActiveForm(null)
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bad/10 border border-bad/20 text-bad text-xs"
          >
            <AlertCircle size={14} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Claim */}
      <FormSection
        label="Add claim"
        active={activeForm === 'claim'}
        onToggle={() => toggle('claim')}
      >
        <form onSubmit={addClaim} className="space-y-3">
          <Input name="id" label="ID (auto if blank)" placeholder="my_claim" />
          <TextArea name="text" label="Claim text" required placeholder="State a narrow, testable claim..." />
          <Input name="tags" label="Tags (comma-separated)" placeholder="ai, remote-work" />
          <Input name="context" label="Context" placeholder="Optional context" />
          <button type="submit" className="px-4 py-2 bg-accent text-bg text-xs font-semibold rounded-lg hover:bg-accent/90">
            Add claim
          </button>
        </form>
      </FormSection>

      {/* Add Evidence */}
      <FormSection
        label="Add evidence"
        active={activeForm === 'evidence'}
        onToggle={() => toggle('evidence')}
      >
        <form onSubmit={addEvidence} className="space-y-3">
          <SelectField name="claim_id" label="Claim" options={graphData.claims.map(c => ({ value: c.id, label: c.text.slice(0, 60) }))} />
          <Input name="source" label="Source" required placeholder="Author, Year - Title" />
          <SelectField name="direction" label="Direction" options={[
            { value: 'supports', label: 'Supports' },
            { value: 'contradicts', label: 'Contradicts' },
          ]} />
          <div className="grid grid-cols-2 gap-3">
            <NumberInput name="strength" label="Strength" min={0} max={1} step={0.05} defaultValue={0.5} />
            <NumberInput name="source_quality" label="Source quality" min={0} max={1} step={0.05} defaultValue={0.5} />
          </div>
          <Input name="notes" label="Notes" placeholder="Optional notes" />
          <button type="submit" className="px-4 py-2 bg-accent text-bg text-xs font-semibold rounded-lg hover:bg-accent/90">
            Add evidence
          </button>
        </form>
      </FormSection>

      {/* Add Edge */}
      <FormSection
        label="Add edge"
        active={activeForm === 'edge'}
        onToggle={() => toggle('edge')}
      >
        <form onSubmit={addEdge} className="space-y-3">
          <SelectField name="source" label="Source claim" options={graphData.claims.map(c => ({ value: c.id, label: c.text.slice(0, 60) }))} />
          <SelectField name="target" label="Target claim" options={graphData.claims.map(c => ({ value: c.id, label: c.text.slice(0, 60) }))} />
          <SelectField name="type" label="Edge type" options={[
            { value: 'depends_on', label: 'depends_on (DAG)' },
            { value: 'supports', label: 'supports' },
            { value: 'contradicts', label: 'contradicts' },
          ]} />
          <NumberInput name="weight" label="Weight" min={0} max={2} step={0.1} defaultValue={1.0} />
          <p className="text-[10px] text-gray-500 italic">depends_on edges are validated — cycles are rejected.</p>
          <button type="submit" className="px-4 py-2 bg-accent text-bg text-xs font-semibold rounded-lg hover:bg-accent/90">
            Add edge
          </button>
        </form>
      </FormSection>
    </div>
  )
}

function FormSection({ label, active, onToggle, children }) {
  return (
    <div className="glass-2 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <Plus size={14} className={`transition-transform ${active ? 'rotate-45' : ''}`} />
          {label}
        </span>
      </button>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Input({ name, label, ...props }) {
  return (
    <label className="block">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <input
        name={name}
        className="mt-1 w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-accent/50"
        {...props}
      />
    </label>
  )
}

function TextArea({ name, label, ...props }) {
  return (
    <label className="block">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <textarea
        name={name}
        rows={3}
        className="mt-1 w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs text-gray-200 resize-y focus:outline-none focus:border-accent/50"
        {...props}
      />
    </label>
  )
}

function NumberInput({ name, label, ...props }) {
  return (
    <label className="block">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <input
        type="number"
        name={name}
        className="mt-1 w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-accent/50"
        {...props}
      />
    </label>
  )
}

function SelectField({ name, label, options }) {
  return (
    <label className="block">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <select
        name={name}
        className="mt-1 w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-accent/50"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}
