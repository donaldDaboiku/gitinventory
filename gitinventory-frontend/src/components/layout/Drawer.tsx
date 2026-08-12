import type { ReactNode } from 'react'

export function Drawer({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="drawer">
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close drawer" />
      <aside className="drawer-panel">
        <div className="panel-header">
          <div>
            <h2>{title}</h2>
            <p>Saved directly through the Laravel API.</p>
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
