import { ListFooter, SimpleTable } from '../ui'
import type { PaginatedMeta, Transaction, TransactionFilters } from '../../types'
import type { MoneyFormatter } from '../../lib/format'

export function TransactionView({
  rows,
  type,
  money,
  meta,
  filters,
  setFilters,
  loading,
  onLoadMore,
  onOpen,
}: {
  rows: Transaction[]
  type: 'sales' | 'purchases'
  money: MoneyFormatter
  meta: PaginatedMeta
  filters: TransactionFilters
  setFilters: (filters: TransactionFilters) => void
  loading: boolean
  onLoadMore: () => void
  onOpen: (id: number) => void
}) {
  const isSales = type === 'sales'

  return (
    <>
      <section className="panel toolbar">
        <div className="toolbar-left">
          <label className="field inline">
            <span>From</span>
            <input
              className="input"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </label>
          <label className="field inline">
            <span>To</span>
            <input
              className="input"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </label>
          <select
            className="input"
            value={filters.paymentStatus}
            onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
          >
            <option value="">All payments</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <span className="tiny">Click a row for line-item details</span>
      </section>
      <section className="panel">
        <SimpleTable
          empty={`No ${type} recorded yet.`}
          headers={['Reference', 'Date', isSales ? 'Customer' : 'Supplier', 'Total', 'Paid', 'Due', 'Status']}
          rows={rows.map((row) => [
            row.invoice_number || row.reference_number || `${type}-${row.id}`,
            isSales ? row.sale_date || '-' : row.purchase_date || '-',
            isSales ? row.customer?.name || 'Walk-in' : row.supplier?.name || '-',
            money(row.total_amount),
            money(row.amount_paid),
            money(row.amount_due),
            row.payment_status || '-',
          ])}
          onRowClick={(index) => onOpen(rows[index].id)}
        />
        <ListFooter meta={meta} itemCount={rows.length} loading={loading} onLoadMore={onLoadMore} />
      </section>
    </>
  )
}
