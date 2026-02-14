'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { typeColors, typeLabels, fetchGraphData, GraphData, GraphFilters } from '@/lib/data'

interface SimNode extends d3.SimulationNodeDatum {
  id: string
  type: string
  label: string
  party?: string
  country?: string
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  weight: number
  timestamps?: string[]
}

interface NetworkGraphProps {
  chargeStrength: number
  filters: GraphFilters
}

// Fixed values
const LINK_DISTANCE = 80
const NODE_SIZE = 8

export default function NetworkGraph({
  chargeStrength,
  filters,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data from API when filters change
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const data = await fetchGraphData(filters)

        if (!cancelled) {
          setGraphData(data)
          if (data.nodes.length === 0) {
            setError('No data returned. Make sure the Python server is running.')
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
        if (!cancelled) {
          setError('Failed to load data. Start the server with: python server.py')
          setGraphData({ nodes: [], links: [] })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [filters])

  // Initialize/update graph
  useEffect(() => {
    if (!svgRef.current || loading) return

    const svg = d3.select(svgRef.current)
    const container = svgRef.current.parentElement!
    const width = container.clientWidth
    const height = container.clientHeight

    // Clear existing content
    svg.selectAll('*').remove()

    // Add zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)
    zoomRef.current = zoom

    // Fit to screen function
    const fitToScreen = () => {
      if (nodes.length === 0) return

      const padding = 50
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity

      nodes.forEach(n => {
        if (n.x !== undefined && n.y !== undefined) {
          minX = Math.min(minX, n.x)
          maxX = Math.max(maxX, n.x)
          minY = Math.min(minY, n.y)
          maxY = Math.max(maxY, n.y)
        }
      })

      if (!isFinite(minX)) return

      const boundsWidth = maxX - minX
      const boundsHeight = maxY - minY
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2

      const scale = Math.min(
        (width - padding * 2) / (boundsWidth || 1),
        (height - padding * 2) / (boundsHeight || 1),
        1.5 // max zoom
      )

      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-centerX, -centerY)

      svg.transition().duration(500).call(zoom.transform, transform)
    }

    // Main group
    const g = svg.append('g')

    // Prepare data
    const nodes: SimNode[] = graphData.nodes.map(d => ({ ...d }))
    const links: SimLink[] = graphData.links.map(d => ({ ...d }))

    // Links
    const linkGroup = g.append('g').attr('class', 'links')
    const link = linkGroup
      .selectAll<SVGLineElement, SimLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.weight) * 1.5)

    // Nodes
    const nodeGroup = g.append('g').attr('class', 'nodes')
    const node = nodeGroup
      .selectAll<SVGCircleElement, SimNode>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', NODE_SIZE)
      .attr('fill', d => typeColors[d.type] || '#999')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'grab')
      .style('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))')

    // Labels (hidden by default)
    const labelGroup = g.append('g').attr('class', 'labels')
    const labels = labelGroup
      .selectAll<SVGTextElement, SimNode>('text')
      .data(nodes)
      .join('text')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#374151')
      .attr('text-anchor', 'middle')
      .attr('dy', -NODE_SIZE - 6)
      .attr('opacity', 0)
      .attr('pointer-events', 'none')
      .text(d => d.label || d.id)

    // Simulation
    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links)
        .id(d => d.id)
        .distance(LINK_DISTANCE))
      .force('charge', d3.forceManyBody<SimNode>().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimNode>().radius(NODE_SIZE + 4))

    simulationRef.current = simulation

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x!)
        .attr('y1', d => (d.source as SimNode).y!)
        .attr('x2', d => (d.target as SimNode).x!)
        .attr('y2', d => (d.target as SimNode).y!)

      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!)

      labels
        .attr('x', d => d.x!)
        .attr('y', d => d.y!)
    })

    // Fit to screen when simulation settles
    simulation.on('end', fitToScreen)

    // Also fit after a short delay for initial layout
    setTimeout(fitToScreen, 300)

    // Drag behavior
    const drag = d3.drag<SVGCircleElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    node.call(drag)

    // Hover effects
    node.on('mouseover', function(event, d) {
      const connectedNodeIds = new Set<string>()
      links.forEach(l => {
        const sourceId = typeof l.source === 'object' ? (l.source as SimNode).id : String(l.source)
        const targetId = typeof l.target === 'object' ? (l.target as SimNode).id : String(l.target)
        if (sourceId === d.id) connectedNodeIds.add(targetId)
        if (targetId === d.id) connectedNodeIds.add(sourceId)
      })

      node
        .attr('opacity', n => n.id === d.id || connectedNodeIds.has(n.id) ? 1 : 0.15)
        .attr('r', n => n.id === d.id ? NODE_SIZE * 1.3 : NODE_SIZE)

      link
        .attr('opacity', l => {
          const sourceId = typeof l.source === 'object' ? (l.source as SimNode).id : String(l.source)
          const targetId = typeof l.target === 'object' ? (l.target as SimNode).id : String(l.target)
          return sourceId === d.id || targetId === d.id ? 1 : 0.05
        })
        .attr('stroke', l => {
          const sourceId = typeof l.source === 'object' ? (l.source as SimNode).id : String(l.source)
          const targetId = typeof l.target === 'object' ? (l.target as SimNode).id : String(l.target)
          return sourceId === d.id || targetId === d.id ? (typeColors[d.type] || '#999') : '#cbd5e1'
        })
        .attr('stroke-width', l => {
          const sourceId = typeof l.source === 'object' ? (l.source as SimNode).id : String(l.source)
          const targetId = typeof l.target === 'object' ? (l.target as SimNode).id : String(l.target)
          return sourceId === d.id || targetId === d.id ? Math.sqrt(l.weight) * 2.5 : Math.sqrt(l.weight) * 1.5
        })

      labels.attr('opacity', n => n.id === d.id || connectedNodeIds.has(n.id) ? 1 : 0)

      // Show tooltip
      if (tooltipRef.current) {
        tooltipRef.current.innerHTML = `
          <div style="font-weight: 700; color: #1e293b;">${d.label || d.id}</div>
          <div style="color: #64748b; font-size: 0.75rem; margin-top: 0.25rem;">${typeLabels[d.type] || 'Unknown'}</div>
          <div style="color: #64748b; font-size: 0.75rem;">${connectedNodeIds.size} connections</div>
        `
        tooltipRef.current.style.opacity = '1'
        tooltipRef.current.style.left = `${event.pageX + 12}px`
        tooltipRef.current.style.top = `${event.pageY + 12}px`
      }
    })

    node.on('mouseout', function() {
      node
        .attr('opacity', 1)
        .attr('r', NODE_SIZE)
      link
        .attr('opacity', 0.6)
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', d => Math.sqrt(d.weight) * 1.5)
      labels.attr('opacity', 0)

      if (tooltipRef.current) {
        tooltipRef.current.style.opacity = '0'
      }
    })

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth
      const newHeight = container.clientHeight
      simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2))
      simulation.alpha(0.3).restart()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      simulation.stop()
      window.removeEventListener('resize', handleResize)
    }
  }, [graphData, loading])

  // Update charge strength
  useEffect(() => {
    if (!simulationRef.current) return

    const simulation = simulationRef.current
    const chargeForce = simulation.force('charge') as d3.ForceManyBody<SimNode>

    if (chargeForce) chargeForce.strength(chargeStrength)

    simulation.alpha(0.3).restart()
  }, [chargeStrength])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#64748b',
          fontSize: '0.875rem',
        }}>
          Loading...
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fef2f2',
          color: '#dc2626',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          fontSize: '0.875rem',
        }}>
          {error} - showing fallback data
        </div>
      )}

      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          background: 'rgb(250, 250, 255)',
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 0.2s',
        }}
      />

      {/* Legend overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: '1rem',
          right: '1rem',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Legend
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Object.entries(typeLabels).map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: typeColors[key],
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '0.8125rem', color: '#475569' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          zIndex: 1000,
          padding: '0.5rem 0.75rem',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e2e8f0',
          fontSize: '0.875rem',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.15s ease',
        }}
      />
    </div>
  )
}
