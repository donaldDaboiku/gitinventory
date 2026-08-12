import { navIcon } from '../../config/navigation'
import type { PageKey } from '../../types'

export function Sidebar({
  tenantName,
  userName,
  page,
  visiblePages,
  onNavigate,
  onLogout,
}: {
  tenantName?: string
  userName?: string
  page: PageKey
  visiblePages: Array<[PageKey, string, string]>
  onNavigate: (key: PageKey) => void
  onLogout: () => void
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">GI</div>
        <div>
          <div className="brand-name">GITInventory</div>
          <div className="brand-meta">{tenantName || 'Workspace'}</div>
        </div>
      </div>

      <nav className="nav">
        {visiblePages.map(([key, label]) => (
          <button
            className={`nav-button ${page === key ? 'active' : ''}`}
            key={key}
            onClick={() => onNavigate(key)}
          >
            <span>{navIcon(key)}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span>Signed in</span>
        <strong>{userName}</strong>
        <button className="btn ghost" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </aside>
  )
}
