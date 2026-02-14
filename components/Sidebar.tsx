'use client'

import { typeLabels, typeColors, GraphFilters, defaultFilters, GraphMode } from '@/lib/data'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  chargeStrength: number
  setChargeStrength: (v: number) => void
  filters: GraphFilters
  setFilters: (f: GraphFilters) => void
}

export default function Sidebar({
  collapsed,
  onToggle,
  chargeStrength,
  setChargeStrength,
  filters,
  setFilters,
}: SidebarProps) {

  const updateFilter = <K extends keyof GraphFilters>(key: K, value: GraphFilters[K]) => {
    setFilters({ ...filters, [key]: value })
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <span className="sidebar-title">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
            />
          </svg>
          Filters
        </span>
        <button className="collapse-btn" onClick={onToggle} title="Toggle sidebar">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Collapsed State Icons */}
      <div className="collapsed-icons">
        <button className="collapsed-icon-btn" onClick={onToggle} title="Expand controls">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
            />
          </svg>
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="sidebar-content">
        {/* Graph Mode */}
        <div className="filter-section">
          <div className="filter-label">Graph Mode</div>
          <div className="filter-options">
            {(['full', 'mep', 'commission'] as GraphMode[]).map((mode) => (
              <button
                key={mode}
                className={`filter-option ${filters.mode === mode ? 'active' : ''}`}
                onClick={() => updateFilter('mode', mode)}
              >
                {mode === 'full' ? 'Full Network' : mode === 'mep' ? 'MEP — Orgs' : 'Commission — Orgs'}
              </button>
            ))}
          </div>
        </div>

        {/* Degree Filters */}
        <div className="filter-section">
          <div className="filter-label">Degree Thresholds</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Org Min Degree */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', color: '#475569' }}>Min Org Connections</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>
                  {filters.orgMinDegree}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={filters.orgMinDegree}
                onChange={(e) => updateFilter('orgMinDegree', Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* Actor Min Degree */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', color: '#475569' }}>Min Actor Connections</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>
                  {filters.actorMinDegree}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={filters.actorMinDegree}
                onChange={(e) => updateFilter('actorMinDegree', Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* K-Core Filter */}
        <div className="filter-section">
          <div className="filter-label">Bipartite K-Core</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: '#475569' }}>K value (0 = off)</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>
              {filters.bipartiteKCore}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={5}
            value={filters.bipartiteKCore}
            onChange={(e) => updateFilter('bipartiteKCore', Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Iteratively prune nodes with degree &lt; K
          </div>
        </div>

        {/* Min Edge Weight */}
        <div className="filter-section">
          <div className="filter-label">Min Edge Weight</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: '#475569' }}>Min meetings</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>
              {filters.minEdgeWeight}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={filters.minEdgeWeight}
            onChange={(e) => updateFilter('minEdgeWeight', Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Hide edges with fewer meetings
          </div>
        </div>

        {/* Layout Control */}
        <div className="filter-section">
          <div className="filter-label">Layout</div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#475569' }}>Node Spacing</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>
                {chargeStrength === -500 ? 'Max' : chargeStrength === -10 ? 'Min' : Math.round(((-chargeStrength - 10) / 490) * 100) + '%'}
              </span>
            </div>
            <input
              type="range"
              min={-500}
              max={-10}
              value={chargeStrength}
              onChange={(e) => setChargeStrength(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Spread out</span>
              <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Cluster</span>
            </div>
          </div>
        </div>

        {/* Keep Isolates Toggle */}
        <div className="filter-section">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filters.keepIsolates}
              onChange={(e) => updateFilter('keepIsolates', e.target.checked)}
              style={{ width: '1rem', height: '1rem' }}
            />
            <span style={{ fontSize: '0.8125rem', color: '#475569' }}>Show isolated nodes</span>
          </label>
        </div>

        {/* Reset Button */}
        <div className="filter-section">
          <button
            onClick={() => {
              setChargeStrength(-150)
              setFilters(defaultFilters)
            }}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: '#f8fafc',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#475569',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#2563eb'
              e.currentTarget.style.color = '#2563eb'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.color = '#475569'
            }}
          >
            Reset All
          </button>
        </div>
      </div>
    </aside>
  )
}
