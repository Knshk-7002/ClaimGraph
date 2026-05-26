import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GitBranch, ArrowRight, Network, Shield, Zap, BarChart3, Database, Eye } from 'lucide-react'
import { datasets } from '../data/datasets'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
}

export default function Landing({ onLoadDataset }) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-8"
          >
            <GitBranch size={14} />
            DAG-powered knowledge reasoning
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight"
          >
            Knowledge is a network of{' '}
            <span className="bg-gradient-to-r from-accent via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              claims & evidence
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed"
          >
            ClaimGraph models knowledge as a directed acyclic graph. Each claim is supported
            or challenged by evidence, and confidence scores propagate through the DAG
            in <strong className="text-gray-200">topological order</strong>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <Link
              to="/explore"
              onClick={() => onLoadDataset('remote_work')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-bg font-semibold rounded-xl hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
            >
              Explore a graph <ArrowRight size={18} />
            </Link>
            <Link
              to="/algorithms"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 text-gray-200 font-semibold rounded-xl border border-border hover:bg-white/10 transition-colors"
            >
              <BookOpen size={18} /> View algorithms
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
          variants={fadeUp}
          className="text-3xl font-bold text-center mb-4"
        >
          How it works
        </motion.h2>
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={1}
          variants={fadeUp}
          className="text-gray-400 text-center mb-12 max-w-xl mx-auto"
        >
          ClaimGraph combines graph theory with evidence-based reasoning
        </motion.p>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i + 2}
              variants={fadeUp}
              className="glass-2 rounded-xl p-6 hover:border-accent/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-base font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Sample Datasets */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
          variants={fadeUp}
          className="text-3xl font-bold text-center mb-4"
        >
          Sample datasets
        </motion.h2>
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={1}
          variants={fadeUp}
          className="text-gray-400 text-center mb-12 max-w-xl mx-auto"
        >
          Explore real-world reasoning graphs with curated evidence
        </motion.p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(datasets).map(([key, ds], i) => (
            <motion.div
              key={key}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i + 2}
              variants={fadeUp}
            >
              <Link
                to="/explore"
                onClick={() => onLoadDataset(key)}
                className="block glass-2 rounded-xl p-6 hover:border-accent/30 transition-all group h-full"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Database size={16} className="text-accent" />
                  </div>
                  <h3 className="font-semibold text-sm">{ds.name}</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">{ds.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{ds.data.claims.length} claims</span>
                  <span>{ds.data.evidence.length} evidence</span>
                  <span>{ds.data.edges.length} edges</span>
                </div>
                <div className="mt-4 text-accent text-sm font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open in explorer <ArrowRight size={14} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Confidence Model */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
          variants={fadeUp}
          className="glass rounded-2xl p-8 md:p-12"
        >
          <h2 className="text-2xl font-bold mb-6">Confidence model</h2>
          <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
            <p>
              Each claim&apos;s confidence is in <code className="text-accent bg-accent/10 px-1.5 py-0.5 rounded text-xs">[-1, +1]</code>{' '}
              where +1 is strongly supported, 0 is neutral, and -1 is strongly contradicted.
            </p>
            <div className="glass-2 rounded-xl p-5">
              <h4 className="font-semibold text-white mb-2">1. Intrinsic confidence</h4>
              <code className="text-accent text-xs block bg-bg/50 rounded-lg p-3 mb-2">
                intrinsic(c) = tanh( &Sigma; sign(e) &times; strength(e) &times; source_quality(e) )
              </code>
              <p className="text-gray-400 text-xs">
                sign(e) is +1 for supporting and -1 for contradicting evidence. tanh keeps the result bounded.
              </p>
            </div>
            <div className="glass-2 rounded-xl p-5">
              <h4 className="font-semibold text-white mb-2">2. Final confidence (propagated)</h4>
              <code className="text-accent text-xs block bg-bg/50 rounded-lg p-3 mb-2">
                final(c) = &alpha; &times; intrinsic(c) + (1 - &alpha;) &times; mean(final(p) for p in prereqs(c))
              </code>
              <p className="text-gray-400 text-xs">
                &alpha; defaults to 0.7. Root claims (no prerequisites) get final = intrinsic.
              </p>
            </div>
            <p className="text-gray-400">
              Because the propagation step needs prerequisites computed first, the engine
              <strong className="text-gray-200"> requires a topological sort</strong> — that&apos;s the DAG backbone of the project.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-gray-500">
        <p>
          ClaimGraph — Knowledge as a DAG of claims &amp; evidence.{' '}
          <a href="https://github.com/patraomsai38/ClaimGraph" target="_blank" rel="noreferrer" className="text-accent hover:underline">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}

function BookOpen(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
  )
}

const features = [
  {
    icon: <Network size={20} className="text-accent" />,
    title: 'DAG-based reasoning',
    desc: 'Claims form a directed acyclic graph. Dependencies are validated — cycles are rejected at insertion time.',
  },
  {
    icon: <BarChart3 size={20} className="text-accent" />,
    title: 'Confidence propagation',
    desc: 'Evidence feeds into intrinsic scores. A topological-order DP blends each claim with its prerequisites.',
  },
  {
    icon: <Zap size={20} className="text-accent" />,
    title: 'O(V + E) algorithms',
    desc: 'Kahn and DFS topological sorts, DAG longest-path, transitive reachability — all linear time.',
  },
  {
    icon: <Shield size={20} className="text-accent" />,
    title: 'Cycle-safe by construction',
    desc: 'The graph enforces acyclicity on depends_on edges. Adding a cycle-creating edge returns a clear error.',
  },
  {
    icon: <Eye size={20} className="text-accent" />,
    title: 'Interactive exploration',
    desc: 'Click any node to see its evidence, confidence breakdown, prerequisites, dependents, and reasoning paths.',
  },
  {
    icon: <Database size={20} className="text-accent" />,
    title: 'Multiple datasets',
    desc: 'Explore remote work, intermittent fasting, and AI hallucinations — each a curated reasoning graph.',
  },
]
