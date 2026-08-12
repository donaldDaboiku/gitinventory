import type { ReactNode } from 'react'

export function Drawer({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="drawer">
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close drawer" />
      <aside className={`drawer-panel${wide ? ' drawer-panel-pos' : ''}`}>
        <div className="panel-header">
          <div>
            <h2>{title}</h2>
            <p>{wide ? 'Tablet-friendly sale desk — scan, tap, and save.' : 'Saved directly through the Laravel API.'}</p>
          </div>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </aside>
    </div>
  )
}
