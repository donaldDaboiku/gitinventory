import { useState } from 'react'
import type { FormEvent } from 'react'
import { Empty, ListFooter, PanelTitle } from '../ui'
import type { Category, PaginatedMeta, Product } from '../../types'
import type { MoneyFormatter } from '../../lib/format'

export function ProductsView({
  products,
  categories,
  money,
  meta,
  search,
  setSearch,
  loading,
  importing,
  canImport,
  onLoadMore,
  onCreateCategory,
  onImportProducts,
  onDownloadImportTemplate,
  onEdit,
  onDelete,
  onPrintLabel,
  onDownloadLabelPdf,
}: {
  products: Product[]
  categories: Category[]
  money: MoneyFormatter
  meta: PaginatedMeta
  search: string
  setSearch: (value: string) => void
  loading: boolean
  importing: boolean
  canImport: boolean
  onLoadMore: () => void
  onCreateCategory: (name: string) => Promise<void>
  onImportProducts: (file: File) => Promise<void>
  onDownloadImportTemplate: () => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  onPrintLabel: (product: Product) => void
  onDownloadLabelPdf: (product: Product) => void
}) {
  const [categoryName, setCategoryName] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)

  const submitCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = categoryName.trim()
    if (!name) return

    setSavingCategory(true)
    try {
      await onCreateCategory(name)
      setCategoryName('')
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not create category.')
    } finally {
      setSavingCategory(false)
    }
  }

  return (
    <>
      <section className="panel toolbar">
        <div className="toolbar-left">
          <input
            className="input search"
            placeholder="Search name, SKU, or barcode"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <span className="tiny">Search updates automatically</span>
      </section>

      {canImport && (
        <section className="panel compact">
          <PanelTitle title="Bulk import" note="Upload a CSV of products (max 200 rows)" />
          <div className="toolbar-left">
            <button className="btn ghost" type="button" onClick={onDownloadImportTemplate}>
              Download template
            </button>
            <label className="btn primary" style={{ cursor: importing ? 'wait' : 'pointer' }}>
              {importing ? 'Importing…' : 'Upload CSV'}
              <input
                type="file"
                accept=".csv,text/csv"
                hidden
                disabled={importing}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) void onImportProducts(file)
                }}
              />
            </label>
          </div>
        </section>
      )}

      <section className="panel compact">
        <PanelTitle title="Categories" note={`${categories.length} available for product assignment`} />
        <form className="toolbar-left" onSubmit={submitCategory}>
          <input
            className="input search"
            placeholder="New category name"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
          />
          <button className="btn ghost" disabled={savingCategory || !categoryName.trim()}>
            {savingCategory ? 'Saving' : 'Add category'}
          </button>
        </form>
      </section>

      <section className="panel">
        {!products.length ? (
          <Empty text="No products found. Add your first stock item." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {['Name', 'SKU', 'Category', 'Branch', 'Qty', 'Price', 'Status', 'Actions'].map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.sku || '-'}</td>
                    <td>{product.category?.name || '-'}</td>
                    <td>{product.branch?.name || '-'}</td>
                    <td>{product.quantity}</td>
                    <td>{money(product.selling_price)}</td>
                    <td>
                      {product.quantity <= (product.min_stock_level || 0)
                        ? 'Low stock'
                        : product.is_active === false
                          ? 'Inactive'
                          : 'Active'}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn ghost" type="button" onClick={() => onPrintLabel(product)}>
                          Label
                        </button>
                        <button className="btn ghost" type="button" onClick={() => void onDownloadLabelPdf(product)}>
                          Label PDF
                        </button>
                        <button className="btn ghost" type="button" onClick={() => onEdit(product)}>
                          Edit
                        </button>
                        <button className="btn ghost danger" type="button" onClick={() => void onDelete(product)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ListFooter meta={meta} itemCount={products.length} loading={loading} onLoadMore={onLoadMore} />
      </section>
    </>
  )
}
