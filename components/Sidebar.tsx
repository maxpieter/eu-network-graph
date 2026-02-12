'use client'

import { groupLabels, groupColors } from '@/lib/data'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  chargeStrength: number
  setChargeStrength: (v: number) => void
  selectedGroup: number | null
  setSelectedGroup: (v: number | null) => void
}

export default function Sidebar({
  collapsed,
  onToggle,
  chargeStrength,
  setChargeStrength,
  selectedGroup,
  setSelectedGroup,
}: SidebarProps) {
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
          Controls
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
        {/* Group Filter */}
        <div className="filter-section">
          <div className="filter-label">Filter by Group</div>
          <div className="filter-options">
            <button
              className={`filter-option ${selectedGroup === null ? 'active' : ''}`}
              onClick={() => setSelectedGroup(null)}
            >
              All Groups
            </button>
            {Object.entries(groupLabels).map(([key, label]) => (
              <button
                key={key}
                className={`filter-option ${selectedGroup === Number(key) ? 'active' : ''}`}
                onClick={() => setSelectedGroup(Number(key))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span
                  className="legend-dot"
                  style={{ backgroundColor: groupColors[Number(key)] }}
                />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="filter-section">
          <div className="filter-label">Layout</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Node Spacing */}
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
        </div>

        {/* Reset Button */}
        <div className="filter-section">
          <button
            onClick={() => {
              setChargeStrength(-150)
              setSelectedGroup(null)
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
