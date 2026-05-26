import { Routes, Route } from 'react-router-dom'
import { useState, useCallback } from 'react'
import Landing from './pages/Landing'
import Explorer from './pages/Explorer'
import Algorithms from './pages/Algorithms'
import Navbar from './components/Navbar'
import { datasets } from './data/datasets'
import { computeConfidences, kahnTopologicalSort, computeLevels } from './engine/graph'

function App() {
  const [currentDataset, setCurrentDataset] = useState('python_first_language')
  const [graphData, setGraphData] = useState(() => initGraphData('python_first_language'))

  function initGraphData(name) {
    const ds = datasets[name]
    if (!ds) return { claims: [], evidence: [], edges: [], confidence: {}, topo: [], levels: {} }
    const { claims, evidence, edges } = ds.data
    const confidence = computeConfidences(claims, evidence, edges)
    const topo = kahnTopologicalSort(claims, edges)
    const levels = computeLevels(claims, edges)
    return { claims, evidence, edges, confidence, topo, levels }
  }

  const loadDataset = useCallback((name) => {
    setCurrentDataset(name)
    setGraphData(initGraphData(name))
  }, [])

  const updateGraph = useCallback((newData) => {
    const { claims, evidence, edges } = newData
    const confidence = computeConfidences(claims, evidence, edges)
    const topo = kahnTopologicalSort(claims, edges)
    const levels = computeLevels(claims, edges)
    setGraphData({ claims, evidence, edges, confidence, topo, levels })
  }, [])

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar currentDataset={currentDataset} onLoadDataset={loadDataset} />
      <Routes>
        <Route path="/" element={<Landing onLoadDataset={loadDataset} />} />
        <Route
          path="/explore"
          element={
            <Explorer
              graphData={graphData}
              currentDataset={currentDataset}
              onLoadDataset={loadDataset}
              onUpdateGraph={updateGraph}
            />
          }
        />
        <Route
          path="/algorithms"
          element={
            <Algorithms
              graphData={graphData}
              currentDataset={currentDataset}
            />
          }
        />
      </Routes>
    </div>
  )
}

export default App
