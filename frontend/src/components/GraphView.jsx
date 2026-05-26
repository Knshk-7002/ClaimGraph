import { useEffect, useRef, useCallback } from 'react'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'

cytoscape.use(dagre)

function confidenceColor(c) {
  const stops = [
    { t: -1, rgb: [185, 28, 28] },
    { t: -0.5, rgb: [248, 113, 113] },
    { t: 0, rgb: [250, 204, 21] },
    { t: 0.5, rgb: [132, 204, 22] },
    { t: 1, rgb: [21, 128, 61] },
  ]
  if (c <= stops[0].t) return rgbCss(stops[0].rgb)
  for (let i = 1; i < stops.length; i++) {
    if (c <= stops[i].t) {
      const a = stops[i - 1], b = stops[i]
      const f = (c - a.t) / (b.t - a.t)
      return rgbCss([
        Math.round(a.rgb[0] + f * (b.rgb[0] - a.rgb[0])),
        Math.round(a.rgb[1] + f * (b.rgb[1] - a.rgb[1])),
        Math.round(a.rgb[2] + f * (b.rgb[2] - a.rgb[2])),
      ])
    }
  }
  return rgbCss(stops[stops.length - 1].rgb)
}

function rgbCss([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`
}

function shortLabel(text) {
  return text.length <= 50 ? text : text.slice(0, 47) + '...'
}

export default function GraphView({ graphData, selectedClaim, onSelectClaim, highlightedNodes, highlightedEdges }) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)

  const buildElements = useCallback(() => {
    const { claims, edges, confidence } = graphData
    const nodes = claims.map(c => {
      const conf = confidence[c.id] || { final: 0 }
      return {
        data: {
          id: c.id,
          short: shortLabel(c.text),
          full: c.text,
          color: confidenceColor(conf.final),
          confVal: conf.final,
        },
      }
    })
    const edgeEls = edges.map(e => ({
      data: {
        id: `${e.source}_${e.type}_${e.target}`,
        source: e.source,
        target: e.target,
        type: e.type,
        label: e.type.replace('_', ' '),
      },
    }))
    return [...nodes, ...edgeEls]
  }, [graphData])

  useEffect(() => {
    if (!containerRef.current) return

    if (cyRef.current) {
      cyRef.current.destroy()
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(),
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(short)',
            'text-wrap': 'wrap',
            'text-max-width': 160,
            'font-size': 10,
            color: '#0b1020',
            'background-color': 'data(color)',
            'border-color': '#0b1020',
            'border-width': 1.5,
            width: 65,
            height: 65,
            'text-valign': 'center',
            'text-halign': 'center',
            padding: '6px',
            'transition-property': 'border-color, border-width, background-color',
            'transition-duration': '0.2s',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#5b9cff',
            'border-width': 4,
          },
        },
        {
          selector: 'node.highlight-topo',
          style: { 'border-color': '#5b9cff', 'border-width': 4 },
        },
        {
          selector: 'node.highlight-path',
          style: { 'border-color': '#facc15', 'border-width': 4 },
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            width: 1.8,
            opacity: 0.8,
            label: 'data(label)',
            'font-size': 8,
            color: '#9aa3b2',
            'text-rotation': 'autorotate',
            'text-background-color': '#0f1115',
            'text-background-opacity': 0.7,
            'text-background-padding': 2,
          },
        },
        {
          selector: "edge[type = 'depends_on']",
          style: { 'line-color': '#94a3b8', 'target-arrow-color': '#94a3b8' },
        },
        {
          selector: "edge[type = 'supports']",
          style: { 'line-color': '#4ade80', 'target-arrow-color': '#4ade80', 'line-style': 'dashed' },
        },
        {
          selector: "edge[type = 'contradicts']",
          style: { 'line-color': '#f87171', 'target-arrow-color': '#f87171', 'line-style': 'dashed' },
        },
        {
          selector: 'edge.highlight-path',
          style: {
            'line-color': '#facc15',
            'target-arrow-color': '#facc15',
            width: 3.5,
            opacity: 1,
          },
        },
      ],
      layout: { name: 'dagre', rankDir: 'LR', nodeSep: 35, rankSep: 90 },
      wheelSensitivity: 0.3,
      minZoom: 0.3,
      maxZoom: 3,
    })

    cy.on('tap', 'node', (evt) => {
      onSelectClaim(evt.target.id())
    })

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        onSelectClaim(null)
      }
    })

    cyRef.current = cy

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [buildElements, onSelectClaim])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.nodes().removeClass('highlight-topo highlight-path')
    cy.edges().removeClass('highlight-path')
    if (highlightedNodes && highlightedNodes.length > 0) {
      for (const id of highlightedNodes) {
        cy.getElementById(id).addClass('highlight-path')
      }
    }
    if (highlightedEdges && highlightedEdges.length > 0) {
      for (const eid of highlightedEdges) {
        cy.getElementById(eid).addClass('highlight-path')
      }
    }
  }, [highlightedNodes, highlightedEdges])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    if (selectedClaim) {
      cy.nodes().unselect()
      cy.getElementById(selectedClaim).select()
    }
  }, [selectedClaim])

  return (
    <div ref={containerRef} className="w-full h-full" />
  )
}
