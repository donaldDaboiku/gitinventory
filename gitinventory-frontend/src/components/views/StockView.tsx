import { Segmented } from '../forms/Segmented'
import { ListFooter, PanelTitle, SimpleTable } from '../ui'
import type { Movement, PaginatedMeta, Product, StockMode } from '../../types'

export function StockView({
  movements,
  lowStockProducts,
  movementsMeta,
  stockMode,
  setStockMode,
  loading,
  onLoadMore,
}: {
  movements: Movement[]
  lowStockProducts: Product[]
  movementsMeta: PaginatedMeta
  stockMode: StockMode
  setStockMode: (mode: StockMode) => void
  loading: boolean
  onLoadMore: () => void
}) {
  return (
    <>
      <section className="panel compact">
        <Segmented
          value={stockMode}
          setValue={setStockMode}
          options={[
            ['in', 'Stock in'],
            ['out', 'Stock out'],
            ['adjust', 'Adjust'],
          ]}
        />
      </section>
      {lowStockProducts.length > 0 && (
        <section className="panel alert-panel">
          <PanelTitle
            title="Low stock alerts"
            note={`${lowStockProducts.length} product(s) at or below minimum level`}
          />
          <SimpleTable
            empty=""
            headers={['Product', 'SKU', 'On hand', 'Min level', 'Branch']}
            rows={lowStockProducts.map((product) => [
              product.name,
              product.sku || '-',
              product.quantity,
              product.min_stock_level ?? 0,
              product.branch?.name || '-',
            ])}
          />
        </section>
      )}
      <section className="panel">
        <PanelTitle title="Stock movement history" note="Latest stock in, stock out, and manual adjustments" />
        <SimpleTable
          empty="No stock movements yet."
          headers={['Product', 'Type', 'Qty', 'Before', 'After', 'Note']}
          rows={movements.map((item) => [
            item.product?.name || '-',
            item.type,
            item.quantity,
            item.quantity_before,
            item.quantity_after,
            item.note || '-',
          ])}
        />
        <ListFooter meta={movementsMeta} itemCount={movements.length} loading={loading} onLoadMore={onLoadMore} />
      </section>
    </>
  )
}
