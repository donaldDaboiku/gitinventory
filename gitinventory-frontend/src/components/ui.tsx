import type { PaginatedMeta } from '../types'

export function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>
}

export function Toast({ message }: { message: string }) {
  return message ? <div className="toast">{message}</div> : null
}

export function PanelTitle({ title, note }: { title: string; note: string }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      <p>{note}</p>
    </div>
  )
}

export function Metric({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: React.ReactNode
  note: string
  tone: string
}) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  )
}

export function SimpleTable({
  headers,
  rows,
  empty,
  onRowClick,
}: {
  headers: string[]
  rows: Array<Array<React.ReactNode>>
  empty: string
  onRowClick?: (index: number) => void
}) {
  if (!rows.length) return <Empty text={empty} />

  return (
    <div className="table-wrap">
      <table className={onRowClick ? 'table-clickable' : undefined}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              onClick={onRowClick ? () => onRowClick(index) : undefined}
              className={onRowClick ? 'clickable-row' : undefined}
            >
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ListFooter({
  meta,
  itemCount,
  loading,
  onLoadMore,
}: {
  meta: PaginatedMeta
  itemCount: number
  loading: boolean
  onLoadMore: () => void
}) {
  const hasMore = meta.page < meta.lastPage

  return (
    <div className="list-footer">
      <span className="tiny">
        Showing {itemCount} of {meta.total}
        {meta.lastPage > 1 ? ` · page ${meta.page} of ${meta.lastPage}` : ''}
      </span>
      {hasMore && (
        <button className="btn ghost" disabled={loading} onClick={onLoadMore}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
