import { motion } from 'framer-motion'
import { GitBranch, ArrowRight, Layers, Route, Network, BarChart3 } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
}

const algorithms = [
  {
    icon: <Layers size={20} className="text-accent" />,
    name: "Kahn's Topological Sort",
    complexity: 'O(V + E)',
    description: 'BFS-based approach using in-degree counting. Nodes with zero in-degree are enqueued first, then as each node is processed, its neighbors\' in-degrees are decremented.',
    pseudocode: `function kahn(graph):
  in_degree = count incoming edges for each node
  queue = nodes where in_degree == 0
  order = []
  while queue is not empty:
    node = queue.dequeue()
    order.append(node)
    for neighbor in adj[node]:
      in_degree[neighbor] -= 1
      if in_degree[neighbor] == 0:
        queue.enqueue(neighbor)
  if len(order) != len(nodes):
    raise CycleError
  return order`,
  },
  {
    icon: <GitBranch size={20} className="text-accent" />,
    name: 'DFS Topological Sort',
    complexity: 'O(V + E)',
    description: 'Depth-first coloring approach (white → gray → black). Nodes are appended in reverse finish order. A gray→gray edge means a cycle.',
    pseudocode: `function dfs_topo(graph):
  color = {node: WHITE for node in graph}
  order = []
  for node in graph:
    if color[node] == WHITE:
      dfs_visit(node, color, order)
  return reversed(order)

function dfs_visit(node, color, order):
  color[node] = GRAY
  for neighbor in adj[node]:
    if color[neighbor] == GRAY:
      raise CycleError
    if color[neighbor] == WHITE:
      dfs_visit(neighbor, color, order)
  color[node] = BLACK
  order.append(node)`,
  },
  {
    icon: <Route size={20} className="text-accent" />,
    name: 'Longest Path (DAG DP)',
    complexity: 'O(V + E)',
    description: 'Topological-order dynamic programming to find the longest dependency chain leading to any claim. Used to surface the deepest reasoning path.',
    pseudocode: `function longest_path_to(graph, target):
  topo = kahn(graph)
  dist = {node: 0 for node in topo}
  prev = {node: None for node in topo}
  for node in topo:
    for (node -> dependent) in edges:
      if dist[node] + 1 > dist[dependent]:
        dist[dependent] = dist[node] + 1
        prev[dependent] = node
  // reconstruct path to target
  path = []
  cur = target
  while cur is not None:
    path.prepend(cur)
    cur = prev[cur]
  return path`,
  },
  {
    icon: <Network size={20} className="text-accent" />,
    name: 'All Reasoning Paths',
    complexity: 'Linear in output',
    description: 'Depth-first enumeration of all root-to-target paths through the dependency DAG. Enumerates every possible chain of reasoning leading to a claim.',
    pseudocode: `function all_paths_to(graph, target):
  paths = []
  function dfs(node, path):
    if node has no prerequisites:
      paths.append(copy(path))
      return
    for prereq in prerequisites[node]:
      path.prepend(prereq)
      dfs(prereq, path)
      path.remove_first()
  dfs(target, [target])
  return paths`,
  },
  {
    icon: <ArrowRight size={20} className="text-accent" />,
    name: 'Transitive Dependencies (BFS)',
    complexity: 'O(V + E)',
    description: 'Breadth-first traversal over the prerequisite adjacency to find all claims that a given claim transitively depends on.',
    pseudocode: `function transitive_deps(graph, claim_id):
  visited = {}
  queue = [direct prerequisites of claim_id]
  while queue is not empty:
    node = queue.dequeue()
    if node in visited: continue
    visited.add(node)
    for prereq in prerequisites[node]:
      queue.enqueue(prereq)
  return visited`,
  },
  {
    icon: <BarChart3 size={20} className="text-accent" />,
    name: 'Confidence Propagation',
    complexity: 'O(V + E)',
    description: 'Two-phase computation: first compute intrinsic confidence from evidence using tanh, then propagate through the DAG in topological order blending with prerequisites.',
    pseudocode: `function compute_confidences(graph, alpha=0.7):
  topo = kahn(graph)
  for claim in topo:
    evs = evidence_for(claim)
    sum = Σ sign(e) × strength(e) × quality(e)
    intrinsic = tanh(sum)
    prereqs = prerequisites(claim)
    if prereqs is empty:
      final = intrinsic
    else:
      mean_p = mean(final(p) for p in prereqs)
      final = alpha × intrinsic + (1-alpha) × mean_p
    store(claim, intrinsic, final)`,
  },
]

const complexityTable = [
  { op: 'Topological sort (Kahn)', impl: 'In-degree BFS', cx: 'O(V + E)' },
  { op: 'Topological sort (DFS)', impl: 'DFS coloring', cx: 'O(V + E)' },
  { op: 'Cycle detection', impl: 'Reachability BFS', cx: 'O(V + E)' },
  { op: 'Longest reasoning chain', impl: 'Topo-order DAG DP', cx: 'O(V + E)' },
  { op: 'All reasoning paths', impl: 'DFS enumeration', cx: 'Linear in output' },
  { op: 'Transitive dependencies', impl: 'BFS', cx: 'O(V + E)' },
  { op: 'Confidence propagation', impl: 'Topo-order DP', cx: 'O(V + E)' },
]

export default function Algorithms({ graphData, currentDataset }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
          <h1 className="text-3xl font-bold mb-2">Algorithm Reference</h1>
          <p className="text-gray-400 mb-10 text-sm">
            All algorithms run in linear time O(V + E). The DAG structure is fundamental
            to every operation — topological ordering enables efficient propagation.
          </p>
        </motion.div>

        {/* Live stats */}
        <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp} className="glass rounded-xl p-5 mb-10">
          <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Current graph stats</h3>
          <div className="grid grid-cols-4 gap-4">
            <Stat label="Claims (V)" value={graphData.claims.length} />
            <Stat label="Edges (E)" value={graphData.edges.length} />
            <Stat label="Evidence" value={graphData.evidence.length} />
            <Stat label="Topo length" value={graphData.topo.length} />
          </div>
          {graphData.topo.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Topological order (Kahn)</p>
              <div className="flex flex-wrap gap-1.5">
                {graphData.topo.map((id, i) => {
                  const c = graphData.claims.find(cl => cl.id === id)
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-bg-panel2 border border-border text-[10px] text-gray-400">
                      <span className="text-accent font-bold">{i + 1}</span>
                      {c ? c.text.slice(0, 30) : id}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Complexity table */}
        <motion.div initial="hidden" animate="visible" custom={2} variants={fadeUp} className="mb-10">
          <h2 className="text-xl font-bold mb-4">Complexity at a glance</h2>
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-gray-500 text-left">
                  <th className="px-4 py-3 font-semibold">Operation</th>
                  <th className="px-4 py-3 font-semibold">Implementation</th>
                  <th className="px-4 py-3 font-semibold">Complexity</th>
                </tr>
              </thead>
              <tbody>
                {complexityTable.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-gray-300">{row.op}</td>
                    <td className="px-4 py-2.5 text-gray-400">{row.impl}</td>
                    <td className="px-4 py-2.5">
                      <code className="text-accent bg-accent/10 px-1.5 py-0.5 rounded text-[10px]">{row.cx}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Algorithm cards */}
        <h2 className="text-xl font-bold mb-6">Algorithms in detail</h2>
        <div className="space-y-6 mb-16">
          {algorithms.map((algo, i) => (
            <motion.div
              key={algo.name}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              variants={fadeUp}
              className="glass rounded-xl overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                    {algo.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{algo.name}</h3>
                    <code className="text-accent text-[10px] bg-accent/10 px-1.5 py-0.5 rounded">{algo.complexity}</code>
                  </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">{algo.description}</p>
                <div className="bg-bg rounded-lg p-4 overflow-x-auto">
                  <pre className="text-[10px] text-gray-300 leading-relaxed font-mono whitespace-pre">{algo.pseudocode}</pre>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-accent">{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{label}</p>
    </div>
  )
}
