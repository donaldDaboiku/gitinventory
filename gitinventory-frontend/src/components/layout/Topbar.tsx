import { addLabel, pageCreatePermission } from '../../config/navigation'
import type { PageKey } from '../../types'

export function Topbar({
  title,
  subtitle,
  page,
  loading,
  can,
  onRefresh,
  onCreate,
  onOpenPos,
  onExport,
  onExportPdf,
}: {
  title: string
  subtitle: string
  page: PageKey
  loading: boolean
  can: (permission: string) => boolean
  onRefresh: () => void
  onCreate: () => void
  onOpenPos?: () => void
  onExport?: () => void
  onExportPdf?: () => void
}) {
  const showCreate =
    page !== 'dashboard' &&
    page !== 'reports' &&
    page !== 'settings' &&
    (!pageCreatePermission[page] || can(pageCreatePermission[page]!))

  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="button-row">
        <button className="btn ghost" onClick={onRefresh}>
          {loading ? 'Loading' : 'Refresh'}
        </button>
        {page === 'sales' && can('sales.create') && onOpenPos && (
          <button className="btn ghost" onClick={onOpenPos}>
            Open POS
          </button>
        )}
        {showCreate && (
          <button className="btn primary" onClick={onCreate}>
            {addLabel(page)}
          </button>
        )}
        {page === 'reports' && can('reports.export') && onExport && (
          <button className="btn ghost" onClick={onExport}>
            Export CSV
          </button>
        )}
        {page === 'reports' && can('reports.export') && onExportPdf && (
          <button className="btn primary" onClick={onExportPdf}>
            Export PDF
          </button>
        )}
      </div>
    </header>
  )
}
