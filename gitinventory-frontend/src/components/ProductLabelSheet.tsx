import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import type { Product } from '../types'
import type { MoneyFormatter } from '../lib/format'

export function ProductLabelSheet({
  product,
  money,
  onClose,
}: {
  product: Product
  money: MoneyFormatter
  onClose: () => void
}) {
  const barcodeRef = useRef<SVGSVGElement>(null)
  const code = product.barcode || product.sku || ''

  useEffect(() => {
    if (!barcodeRef.current || !code) return
    try {
      JsBarcode(barcodeRef.current, code, {
        format: 'CODE128',
        width: 1.6,
        height: 48,
        displayValue: true,
        fontSize: 12,
        margin: 4,
      })
    } catch {
      // invalid code for barcode rendering
    }
  }, [code])

  const print = () => {
    window.print()
  }

  return (
    <div className="label-sheet">
      <div className="label-sheet-actions no-print">
        <button className="btn ghost" type="button" onClick={onClose}>
          Close
        </button>
        <button className="btn primary" type="button" onClick={print}>
          Print label
        </button>
      </div>
      <div className="print-label">
        <div className="print-label-name">{product.name}</div>
        <div className="print-label-price">{money(product.selling_price)}</div>
        {code ? <svg ref={barcodeRef} /> : <div className="tiny">No barcode on file</div>}
        {product.sku && <div className="tiny">SKU: {product.sku}</div>}
      </div>
    </div>
  )
}
