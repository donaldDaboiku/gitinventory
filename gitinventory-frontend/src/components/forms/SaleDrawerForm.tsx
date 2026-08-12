import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Field } from './Field'
import { Options } from './Options'
import { SelectField } from './SelectField'
import { Textarea } from './Textarea'
import type { AppData, ProductLookup } from '../../types'

type LinePreset = {
  productId: number
  unitPrice: number
  name: string
}

export function SaleDrawerForm({
  data,
  saleLines,
  setSaleLines,
  onSubmit,
  lookupProduct,
}: {
  data: AppData
  saleLines: number[]
  setSaleLines: (lines: number[]) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  lookupProduct: (code: string) => Promise<ProductLookup>
}) {
  const [linePresets, setLinePresets] = useState<Record<number, LinePreset>>({})
  const [scanCode, setScanCode] = useState('')
  const [scanError, setScanError] = useState('')
  const [scanning, setScanning] = useState(false)
  const scanRef = useRef<HTMLInputElement>(null)

  const handleScan = async (event: FormEvent) => {
    event.preventDefault()
    const code = scanCode.trim()
    if (!code) return

    setScanning(true)
    setScanError('')

    try {
      const product = await lookupProduct(code)
      const lineId = Date.now()
      setLinePresets((current) => ({
        ...current,
        [lineId]: {
          productId: product.id,
          unitPrice: Number(product.selling_price),
          name: product.name,
        },
      }))
      setSaleLines([...saleLines, lineId])
      setScanCode('')
      scanRef.current?.focus()
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Product not found.')
    } finally {
      setScanning(false)
    }
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <section className="panel compact scan-panel">
        <div className="panel-header">
          <h3>Scan barcode</h3>
          <span className="tiny">USB scanner or type code + Enter</span>
        </div>
        <form className="toolbar-left scan-form" onSubmit={handleScan}>
          <input
            ref={scanRef}
            className="input search"
            placeholder="Scan barcode or SKU"
            value={scanCode}
            onChange={(event) => setScanCode(event.target.value)}
            autoComplete="off"
          />
          <button className="btn ghost" type="submit" disabled={scanning || !scanCode.trim()}>
            {scanning ? 'Looking up…' : 'Add item'}
          </button>
        </form>
        {scanError && <p className="tiny scan-error">{scanError}</p>}
      </section>

      <div className="form-grid two">
        <Field
          label="Date"
          name="sale_date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
        />
        <SelectField label="Branch" name="branch_id">
          <Options rows={data.branches} placeholder="Select branch" />
        </SelectField>
      </div>
      <SelectField label="Customer" name="customer_id">
        <Options rows={data.customers} placeholder="Walk-in customer" />
      </SelectField>
      <SelectField label="Payment method" name="payment_method" required>
        {['cash', 'transfer', 'pos', 'wallet'].map((method) => (
          <option value={method} key={method}>
            {method}
          </option>
        ))}
      </SelectField>
      <div className="form-grid two">
        <Field label="Amount paid" name="amount_paid" type="number" min={0} step="0.01" defaultValue={0} required />
        <Field label="Discount" name="discount_amount" type="number" min={0} step="0.01" />
      </div>
      <div className="panel inner-panel">
        <div className="panel-header">
          <h3>Items</h3>
          <button className="btn ghost" type="button" onClick={() => setSaleLines([...saleLines, Date.now()])}>
            Add line
          </button>
        </div>
        <div className="form-grid">
          {saleLines.map((line) => {
            const preset = linePresets[line]
            return (
              <div className="item-line" data-line key={line}>
                {preset && <span className="tiny line-hint">{preset.name}</span>}
                <SelectField label="Product" name="product_id" required defaultValue={preset?.productId ?? ''}>
                  <Options rows={data.products} placeholder="Select product" />
                </SelectField>
                <Field
                  label="Qty"
                  name="quantity"
                  type="number"
                  min={1}
                  defaultValue={1}
                  required
                />
                <Field
                  label="Price"
                  name="unit_price"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={preset?.unitPrice ?? ''}
                  required
                />
                <button
                  className="btn ghost line-remove"
                  type="button"
                  onClick={() => saleLines.length > 1 && setSaleLines(saleLines.filter((item) => item !== line))}
                >
                  X
                </button>
              </div>
            )
          })}
        </div>
      </div>
      <Textarea label="Notes" name="notes" />
      <button className="btn primary">Save sale</button>
    </form>
  )
}
