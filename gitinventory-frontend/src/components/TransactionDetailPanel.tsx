import { PanelTitle, SimpleTable } from './ui'
import type { Transaction } from '../types'

export function TransactionDetailPanel({
  detail,
  type,
  money,
  onClose,
  onDownloadPdf,
}: {
  detail: Transaction
  type: 'sales' | 'purchases'
  money: (value: string | number | undefined) => string
  onClose: () => void
  onDownloadPdf?: () => void
}) {
  const isSales = type === 'sales'
  const items = detail.items || []

  return (
    <div className="detail-panel">
      <div className="panel-header">
        <PanelTitle
          title={detail.invoice_number || detail.reference_number || `${type}-${detail.id}`}
          note={isSales ? `Sale · ${detail.sale_date || '-'}` : `Purchase · ${detail.purchase_date || '-'}`}
        />
        <div className="button-row">
          {isSales && onDownloadPdf && (
            <button className="btn primary" type="button" onClick={onDownloadPdf}>
              Download receipt
            </button>
          )}
          <button className="btn ghost" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="metrics-grid compact">
        <div className="metric blue">
          <span>Total</span>
          <strong>{money(detail.total_amount)}</strong>
        </div>
        <div className="metric green">
          <span>Paid</span>
          <strong>{money(detail.amount_paid)}</strong>
        </div>
        <div className="metric amber">
          <span>Due</span>
          <strong>{money(detail.amount_due)}</strong>
        </div>
        <div className="metric blue">
          <span>Status</span>
          <strong>{detail.payment_status || '-'}</strong>
        </div>
      </div>

      <SimpleTable
        empty="No line items."
        headers={isSales ? ['Product', 'Qty', 'Price', 'Subtotal'] : ['Product', 'Ordered', 'Received', 'Cost', 'Subtotal']}
        rows={items.map((item) =>
          isSales
            ? [
                item.product?.name || '-',
                item.quantity ?? '-',
                money(item.unit_price),
                money(item.subtotal),
              ]
            : [
                item.product?.name || '-',
                item.quantity_ordered ?? '-',
                item.quantity_received ?? '-',
                money(item.unit_cost),
                money(item.subtotal),
              ],
        )}
      />

      {detail.notes && <p className="tiny detail-notes">Notes: {detail.notes}</p>}
    </div>
  )
}
