import { Empty, PanelTitle } from '../ui'
import type { Person } from '../../types'

export function DirectoryView({
  rows,
  title,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  rows: Person[]
  title: string
  canEdit: boolean
  canDelete: boolean
  onEdit: (row: Person) => void
  onDelete: (row: Person) => void
}) {
  const showActions = canEdit || canDelete

  return (
    <section className="panel">
      <PanelTitle title={title} note={`Manage ${title.toLowerCase()} available to this tenant`} />
      {!rows.length ? (
        <Empty text={`No ${title.toLowerCase()} added yet.`} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Name', 'Email', 'Phone', 'Location', 'Status', ...(showActions ? ['Actions'] : [])].map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.email || '-'}</td>
                  <td>{row.phone || '-'}</td>
                  <td>{row.address || row.city || row.state || '-'}</td>
                  <td>{row.is_active === false ? 'Inactive' : 'Active'}</td>
                  {showActions && (
                    <td>
                      <div className="row-actions">
                        {canEdit && (
                          <button className="btn ghost" type="button" onClick={() => onEdit(row)}>
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button className="btn ghost danger" type="button" onClick={() => void onDelete(row)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
