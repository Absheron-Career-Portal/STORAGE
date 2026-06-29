import React, { useState } from 'react'
import ActivityPanel from './ActivityPanel'
import CareerPanel from './CareerPanel'

const NAV = [
  {
    id: 'career',
    label: 'Vəzifələr',
    sub: 'Career Management',
    icon: (
      <svg className="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    ),
  },
  {
    id: 'activity',
    label: 'Fəaliyyətlər',
    sub: 'Activity Management',
    icon: (
      <svg className="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M3 15l5-5 4 4 3-3 6 6" />
        <circle cx="8.5" cy="8.5" r="1.5" />
      </svg>
    ),
  },
]

const AdminPanel = () => {
  const [active, setActive] = useState('career')
  const current = NAV.find((n) => n.id === active)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div className="brand-text">
            <strong>Storage</strong>
            <span>Abşeron Logistika</span>
          </div>
        </div>

        <div className="nav-label">İdarəetmə</div>
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-item ${active === n.id ? 'active' : ''}`}
            onClick={() => setActive(n.id)}
          >
            {n.icon}
            {n.label}
          </button>
        ))}

        <div className="sidebar-foot">Məzmun idarəetmə paneli</div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <h1>{current.label}</h1>
            <div className="sub">{current.sub}</div>
          </div>
        </header>

        <main className="content">
          {active === 'activity' && <ActivityPanel />}
          {active === 'career' && <CareerPanel />}
        </main>
      </div>
    </div>
  )
}

export default AdminPanel
