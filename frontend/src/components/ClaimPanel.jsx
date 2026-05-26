import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, FileText, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { allPathsTo, transitiveDependencies } from '../engine/graph'

function formatConf(v) {
  if (v === null || v === undefined) return 'n/a'
  return (v >= 0 ? '+' : '') + v.toFixed(3)
}

function confBarColor(v) {
  if (v >= 0.3) return 'bg-good'
  if (v >= -0.3) return 'bg-warn'
  return 'bg-bad'
}

export default function ClaimPanel({ graphData, selectedClaim, onClose, onDeleteClaim, onDeleteEvidence }) {
  const [showPaths, setShowPaths] = useState(false)
  const [showDeps, setShowDeps] = useState(false)

  if (!selectedClaim) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 px-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-bg-panel2 border border-border flex items-center justify-center mb-4">
          <FileText size={24} className="text-gray-600" />
        </div>
        <p className="text-sm">Click any node in the graph to inspect its details.</p>
      </div>
    )
  }

  const claim = graphData.claims.find(c => c.id === selectedClaim)
  if (!claim) return null

  const conf = graphData.confidence[selectedClaim] || { intrinsic: 0, final: 0, prereqs_mean: null }
  const evs = graphData.evidence.filter(e => e.claim_id === selectedClaim)
  const directDeps = graphData.edges
    .filter(e => e.source === selectedClaim && e.type === 'depends_on')
    .map(e => graphData.claims.find(c => c.id === e.target))
    .filter(Boolean)
  const dependents = graphData.edges
    .filter(e => e.target === selectedClaim && e.type === 'depends_on')
    .map(e => graphData.claims.find(c => c.id === e.source))
    .filter(Boolean)

  const paths = showPaths ? allPathsTo(graphData.claims, graphData.edges, selectedClaim) : []
  const transDeps = showDeps ? transitiveDependencies(graphData.claims, graphData.edges, selectedClaim) : []

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={selectedClaim}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        className="h-full overflow-y-auto"
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="rounded-lg border border-border bg-bg-panel2/50 px-3 py-2.5">
              <h2 className="text-sm font-bold leading-snug">{claim.text}</h2>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(claim.tags || []).map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-bg-panel2 border border-border text-[10px] text-gray-400">
                  {t}
                </span>
              ))}
            </div>
            {claim.context && (
              <p className="text-[11px] text-gray-500 mt-1.5 italic">{claim.context}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1">
            <X size={16} />
          </button>
        </div>

        {/* Confidence */}
        <div className="p-4 border-b border-border">
          <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-3">Confidence</h3>
          <div className="grid grid-cols-2 gap-3">
            <ConfCard label="Intrinsic" value={conf.intrinsic} hint="From this claim's own evidence" />
            <ConfCard
              label="Final"
              value={conf.final}
              hint={conf.prereqs_mean === null ? 'No prerequisites' : `mean(prereqs) = ${formatConf(conf.prereqs_mean)}`}
            />
          </div>
          <div className="mt-3 h-2 rounded-full bg-bg overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${confBarColor(conf.final)}`}
              style={{ width: `${((conf.final + 1) / 2) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>-1 contradicted</span>
            <span>+1 supported</span>
          </div>
        </div>

        {/* Evidence */}
        <div className="p-4 border-b border-border">
          <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-3">
            Evidence ({evs.length})
          </h3>
          {evs.length === 0 ? (
            <p className="text-xs text-gray-500">No evidence attached yet.</p>
          ) : (
            <div className="space-y-2">
              {evs.map(ev => (
                <div
                  key={ev.id}
                  className={`rounded-lg p-3 text-xs border-l-[3px] ${
                    ev.direction === 'supports'
                      ? 'border-l-good bg-good/5'
                      : 'border-l-bad bg-bad/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-200 leading-snug">{ev.source}</p>
                    <button
                      onClick={() => onDeleteEvidence(ev.id)}
                      className="text-gray-600 hover:text-bad shrink-0"
                      title="Remove evidence"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-gray-500">
                    <span className={ev.direction === 'supports' ? 'text-good' : 'text-bad'}>
                      {ev.direction}
                    </span>
                    <span>str: {ev.strength.toFixed(2)}</span>
                    <span>qual: {ev.source_quality.toFixed(2)}</span>
                  </div>
                  {ev.notes && <p className="text-gray-500 mt-1 italic">{ev.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prerequisites & Dependents */}
        <div className="p-4 border-b border-border">
          <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-3">
            Prerequisites ({directDeps.length})
          </h3>
          {directDeps.length === 0 ? (
            <p className="text-xs text-gray-500 italic">Root claim — no prerequisites.</p>
          ) : (
            <ul className="space-y-1.5">
              {directDeps.map(c => (
                <li key={c.id} className="rounded-lg border border-border bg-bg-panel2/40 px-3 py-2 text-xs text-gray-300 flex items-start gap-1.5">
                  <ArrowRight size={12} className="text-accent mt-0.5 shrink-0" />
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          )}

          <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mt-5 mb-3">
            Dependents ({dependents.length})
          </h3>
          {dependents.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No claim depends on this.</p>
          ) : (
            <ul className="space-y-1.5">
              {dependents.map(c => (
                <li key={c.id} className="rounded-lg border border-border bg-bg-panel2/40 px-3 py-2 text-xs text-gray-300 flex items-start gap-1.5">
                  <ArrowLeft size={12} className="text-warn mt-0.5 shrink-0" />
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Reasoning Paths */}
        <div className="p-4 border-b border-border">
          <button
            onClick={() => setShowPaths(!showPaths)}
            className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-gray-500 font-semibold w-full"
          >
            Reasoning paths
            {showPaths ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showPaths && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
              {paths.length === 0 ? (
                <p className="text-xs text-gray-500">No reasoning paths (root claim).</p>
              ) : (
                <ol className="space-y-2">
                  {paths.map((path, i) => (
                    <li key={i} className="rounded-lg border border-border bg-bg-panel2/40 px-3 py-2 text-xs text-gray-400">
                      <span className="text-accent font-semibold mr-1.5">{i + 1}.</span>
                      {path.map(id => graphData.claims.find(c => c.id === id)?.text?.slice(0, 40) || id).join(' → ')}
                    </li>
                  ))}
                </ol>
              )}
            </motion.div>
          )}
        </div>

        {/* Transitive Dependencies */}
        <div className="p-4">
          <button
            onClick={() => setShowDeps(!showDeps)}
            className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-gray-500 font-semibold w-full"
          >
            Transitive dependencies
            {showDeps ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showDeps && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
              {transDeps.length === 0 ? (
                <p className="text-xs text-gray-500">No transitive dependencies.</p>
              ) : (
                <ul className="space-y-1.5">
                  {transDeps.map(id => {
                    const c = graphData.claims.find(cl => cl.id === id)
                    return (
                      <li key={id} className="rounded-lg border border-border bg-bg-panel2/40 px-3 py-2 text-xs text-gray-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent/50 shrink-0" />
                        {c ? c.text : id}
                      </li>
                    )
                  })}
                </ul>
              )}
            </motion.div>
          )}
        </div>

        {/* Delete */}
        <div className="p-4 border-t border-border">
          <button
            onClick={() => onDeleteClaim(selectedClaim)}
            className="text-xs text-bad/70 hover:text-bad flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={12} />
            Delete this claim
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function ConfCard({ label, value, hint }) {
  return (
    <div className="glass-2 rounded-lg p-3">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <p className={`text-lg font-bold mt-0.5 ${value >= 0.3 ? 'text-good' : value >= -0.3 ? 'text-warn' : 'text-bad'}`}>
        {formatConf(value)}
      </p>
      <span className="text-[10px] text-gray-600">{hint}</span>
    </div>
  )
}
