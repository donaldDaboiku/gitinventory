import { Empty, Metric, PanelTitle, SimpleTable } from '../ui'
import type { FinancialReport } from '../../types'
import type { MoneyFormatter } from '../../lib/format'

export function ReportsView({
  report,
  money,
  reportFrom,
  reportTo,
  setReportFrom,
  setReportTo,
  onRun,
}: {
  report: FinancialReport | null
  money: MoneyFormatter
  reportFrom: string
  reportTo: string
  setReportFrom: (value: string) => void
  setReportTo: (value: string) => void
  onRun: () => void
}) {
  const summary = report?.summary

  return (
    <>
      <section className="panel toolbar">
        <div className="toolbar-left">
          <label className="field inline">
            <span>From</span>
            <input className="input" type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />
          </label>
          <label className="field inline">
            <span>To</span>
            <input className="input" type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
          </label>
          <button className="btn ghost" onClick={onRun}>
            Generate
          </button>
        </div>
        {report?.period && (
          <span className="tiny">
            {report.period.date_from} → {report.period.date_to}
          </span>
        )}
      </section>

      {summary ? (
        <>
          <div className="metrics-grid">
            <Metric label="Revenue" value={money(summary.revenue)} note={`${summary.sales_count} sales`} tone="green" />
            <Metric label="Gross profit" value={money(summary.gross_profit)} note={`${summary.gross_margin_pct}% margin`} tone="blue" />
            <Metric label="COGS" value={money(summary.cost_of_goods_sold)} note="Cost of goods sold" tone="amber" />
            <Metric label="Purchases" value={money(summary.purchases_total)} note={`${summary.purchases_count} orders`} tone="rose" />
          </div>
          <div className="metrics-grid">
            <Metric label="Receivables" value={money(summary.receivables)} note="Outstanding from customers" tone="amber" />
            <Metric label="Payables" value={money(summary.payables)} note="Outstanding to suppliers" tone="rose" />
            <Metric label="Stock value" value={money(summary.stock_valuation)} note="Inventory at cost price" tone="blue" />
          </div>
          <section className="panel">
            <PanelTitle title="Daily breakdown" note="Revenue and gross profit by sale date" />
            <SimpleTable
              empty="No sales in this period."
              headers={['Date', 'Sales', 'Revenue', 'Gross profit']}
              rows={(report?.daily_breakdown || []).map((row) => [
                row.date,
                row.sales_count,
                money(row.revenue),
                money(row.gross_profit),
              ])}
            />
          </section>
        </>
      ) : (
        <Empty text="Choose a date range and click Generate." />
      )}
    </>
  )
}
