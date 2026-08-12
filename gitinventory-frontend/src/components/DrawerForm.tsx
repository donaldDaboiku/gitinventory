import { useState } from 'react'
import type { FormEvent } from 'react'
import { ProductCodeFields } from './ProductCodeFields'
import { SaleDrawerForm } from './forms/SaleDrawerForm'
import { Field } from './forms/Field'
import { Options } from './forms/Options'
import { Segmented } from './forms/Segmented'
import { SelectField } from './forms/SelectField'
import { Textarea } from './forms/Textarea'
import { units } from '../config/navigation'
import { formatDateInput } from '../lib/form'
import type { AppData, Branch, PageKey, Person, Product, ProductLookup, StockMode } from '../types'

export function DrawerForm({
  drawer,
  data,
  editingProduct,
  editingDirectory,
  stockMode,
  setStockMode,
  saleLines,
  setSaleLines,
  purchaseLines,
  setPurchaseLines,
  onSubmit,
  onCreateCategory,
  fetchProductCodes,
  lookupProduct,
}: {
  drawer: PageKey
  data: AppData
  editingProduct: Product | null
  editingDirectory: Person | Branch | null
  stockMode: StockMode
  setStockMode: (mode: StockMode) => void
  saleLines: number[]
  setSaleLines: (lines: number[]) => void
  purchaseLines: number[]
  setPurchaseLines: (lines: number[]) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCreateCategory: (name: string) => Promise<void>
  fetchProductCodes: () => Promise<{ sku: string; barcode: string }>
  lookupProduct: (code: string) => Promise<ProductLookup>
}) {
  const [quickCategory, setQuickCategory] = useState('')

  const addQuickCategory = async () => {
    const name = quickCategory.trim()
    if (!name) return
    await onCreateCategory(name)
    setQuickCategory('')
  }

  if (drawer === 'products') {
    const product = editingProduct

    return (
      <form className="form-grid" key={product?.id ?? 'new-product'} onSubmit={onSubmit}>
        <Field label="Name" name="name" defaultValue={product?.name} required />
        <ProductCodeFields
          editing={Boolean(product)}
          initialSku={product?.sku}
          initialBarcode={product?.barcode}
          fetchCodes={fetchProductCodes}
        />
        <div className="form-grid two">
          <SelectField
            label="Category"
            name="category_id"
            defaultValue={product?.category_id ?? product?.category?.id ?? ''}
          >
            <Options rows={data.categories} placeholder="Select category" />
          </SelectField>
          <SelectField
            label="Branch"
            name="branch_id"
            defaultValue={product?.branch_id ?? product?.branch?.id ?? ''}
          >
            <Options rows={data.branches} placeholder="Select branch" />
          </SelectField>
        </div>
        <div className="toolbar-left">
          <input
            className="input"
            placeholder="Quick-add category"
            value={quickCategory}
            onChange={(event) => setQuickCategory(event.target.value)}
          />
          <button className="btn ghost" type="button" onClick={() => void addQuickCategory()}>
            Add
          </button>
        </div>
        <div className="form-grid two">
          <SelectField label="Unit" name="unit" required defaultValue={product?.unit ?? 'piece'}>
            {units.map((unit) => (
              <option value={unit} key={unit}>
                {unit}
              </option>
            ))}
          </SelectField>
          {product ? (
            <label className="field">
              <span>On-hand quantity</span>
              <input className="input" value={product.quantity} readOnly />
            </label>
          ) : (
            <Field label="Quantity" name="quantity" type="number" min={0} defaultValue={0} required />
          )}
        </div>
        <div className="form-grid two">
          <Field
            label="Cost price"
            name="cost_price"
            type="number"
            min={0}
            step="0.01"
            defaultValue={product?.cost_price ?? ''}
            required
          />
          <Field
            label="Selling price"
            name="selling_price"
            type="number"
            min={0}
            step="0.01"
            defaultValue={product?.selling_price ?? ''}
            required
          />
        </div>
        <div className="form-grid two">
          <Field
            label="Min stock"
            name="min_stock_level"
            type="number"
            min={0}
            defaultValue={product?.min_stock_level ?? 0}
          />
          <Field
            label="Expiry date"
            name="expiry_date"
            type="date"
            defaultValue={formatDateInput(product?.expiry_date)}
          />
        </div>
        <Textarea label="Description" name="description" defaultValue={product?.description ?? ''} />
        {product && <p className="tiny">Change stock levels from the Stock page.</p>}
        <button className="btn primary">{product ? 'Update product' : 'Save product'}</button>
      </form>
    )
  }

  if (drawer === 'stock') {
    const isAdjust = stockMode === 'adjust'
    return (
      <form className="form-grid" onSubmit={onSubmit}>
        <Segmented
          value={stockMode}
          setValue={setStockMode}
          options={[
            ['in', 'Stock in'],
            ['out', 'Stock out'],
            ['adjust', 'Adjust'],
          ]}
        />
        <SelectField label="Product" name="product_id" required>
          <Options rows={data.products} placeholder="Select product" />
        </SelectField>
        <Field
          label={isAdjust ? 'New quantity' : 'Quantity'}
          name={isAdjust ? 'new_quantity' : 'quantity'}
          type="number"
          min={isAdjust ? 0 : 1}
          required
        />
        {stockMode === 'in' && <Field label="Unit cost" name="unit_cost" type="number" min={0} step="0.01" />}
        <Textarea label="Note" name="note" required={isAdjust} />
        <button className="btn primary">Save movement</button>
      </form>
    )
  }

  if (drawer === 'sales') {
    return (
      <SaleDrawerForm
        data={data}
        saleLines={saleLines}
        setSaleLines={setSaleLines}
        onSubmit={onSubmit}
        lookupProduct={lookupProduct}
      />
    )
  }

  if (drawer === 'purchases') {
    const lines = purchaseLines
    const setLines = setPurchaseLines

    return (
      <form className="form-grid" onSubmit={onSubmit}>
        <div className="form-grid two">
          <Field
            label="Date"
            name="purchase_date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
          <SelectField label="Branch" name="branch_id">
            <Options rows={data.branches} placeholder="Select branch" />
          </SelectField>
        </div>
        <SelectField label="Supplier" name="supplier_id">
          <Options rows={data.suppliers} placeholder="Optional supplier" />
        </SelectField>
        <Field label="Reference number" name="reference_number" />
        <div className="form-grid two">
          <Field label="Amount paid" name="amount_paid" type="number" min={0} step="0.01" defaultValue={0} required />
        </div>
        <div className="panel inner-panel">
          <div className="panel-header">
            <h3>Items</h3>
            <button className="btn ghost" type="button" onClick={() => setLines([...lines, Date.now()])}>
              Add line
            </button>
          </div>
          <div className="form-grid">
            {lines.map((line) => (
              <div className="item-line" data-line key={line}>
                <SelectField label="Product" name="product_id" required>
                  <Options rows={data.products} placeholder="Select product" />
                </SelectField>
                <Field label="Qty" name="quantity_ordered" type="number" min={1} defaultValue={1} required />
                <Field label="Received" name="quantity_received" type="number" min={0} defaultValue={1} required />
                <Field label="Cost" name="unit_cost" type="number" min={0} step="0.01" required />
                <button
                  className="btn ghost line-remove"
                  type="button"
                  onClick={() => lines.length > 1 && setLines(lines.filter((item) => item !== line))}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
        <Textarea label="Notes" name="notes" />
        <button className="btn primary">Save purchase</button>
      </form>
    )
  }

  const fields: Record<string, string[]> = {
    customers: ['name', 'email', 'phone', 'address', 'city', 'credit_limit'],
    suppliers: ['name', 'email', 'phone', 'address'],
    branches: ['name', 'code', 'email', 'phone', 'address', 'city', 'state'],
  }

  const record = editingDirectory
  const directoryDefaults = record as Record<string, string | number | null | undefined> | null

  return (
    <form className="form-grid" key={record?.id ?? `new-${drawer}`} onSubmit={onSubmit}>
      {fields[drawer].map((field) => (
        <Field
          label={field.replaceAll('_', ' ')}
          name={field}
          key={field}
          type={field === 'email' ? 'email' : field === 'credit_limit' ? 'number' : 'text'}
          min={field === 'credit_limit' ? 0 : undefined}
          step={field === 'credit_limit' ? '0.01' : undefined}
          defaultValue={directoryDefaults?.[field] ?? ''}
          required={field === 'name'}
        />
      ))}
      <button className="btn primary">{record ? `Update ${drawer.slice(0, -1)}` : `Save ${drawer.slice(0, -1)}`}</button>
    </form>
  )
}
