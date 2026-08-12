import { Empty, Metric, PanelTitle, SimpleTable } from '../ui'
import type { Branch, Dashboard } from '../../types'
import type { MoneyFormatter } from '../../lib/format'

export function DashboardView({
  dashboard,
  branches,
  money,
}: {
  dashboard: Dashboard | null
  branches: Branch[]
  money: MoneyFormatter
}) {
  const metrics = dashboard?.metrics
  const today = metrics?.today
  const month = metrics?.this_month
  const chart = dashboard?.charts?.sales_last_7_days || []
  const max = Math.max(...chart.map((row) => Number(row.revenue || 0)), 1)

  return (
    <>
      <div className="metrics-grid">
        <Metric label="Today revenue" value={money(today?.revenue)} note={`${today?.sales_count || 0} sales`} tone="green" />
        <Metric label="Month revenue" value={money(month?.revenue)} note={`${month?.sales_count || 0} sales`} tone="blue" />
        <Metric label="Low stock" value={metrics?.low_stock_count || 0} note="Needs reorder attention" tone="amber" />
        <Metric label="Receivables" value={money(metrics?.pending_receivables)} note="Pending customer payments" tone="rose" />
      </div>

      <div className="grid-2">
        <section className="panel">
          <PanelTitle title="Last 7 days sales" note="Completed sales revenue by day" />
          {chart.length ? (
            <div className="chart-bars">
              {chart.map((row) => (
                <div className="bar-wrap" key={row.sale_date} title={money(row.revenue)}>
                  <div className="bar" style={{ height: Math.max(10, (Number(row.revenue) / max) * 190) }} />
                  <span>{row.sale_date.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No chart data yet." />
          )}
        </section>

        <section className="panel">
          <PanelTitle title="Top products" note="Best sellers this month" />
          <SimpleTable
            empty="No completed sales yet."
            headers={['Product', 'Qty', 'Revenue']}
            rows={(dashboard?.charts?.top_products || []).map((row) => [
              row.name,
              row.total_qty,
              money(row.total_revenue),
            ])}
          />
        </section>
      </div>

      <div className="metrics-grid">
        <Metric label="Active products" value={metrics?.total_products || 0} note="Available catalog items" tone="blue" />
        <Metric label="Expiring soon" value={metrics?.expiring_soon || 0} note="Within 30 days" tone="amber" />
        <Metric label="Month profit" value={money(month?.profit)} note="Estimated gross profit" tone="green" />
        <Metric label="Branches" value={branches.length} note="Operating locations" tone="blue" />
      </div>
    </>
  )
}
