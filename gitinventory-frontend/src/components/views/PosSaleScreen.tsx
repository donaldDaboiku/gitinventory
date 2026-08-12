import { SaleDrawerForm } from '../forms/SaleDrawerForm'
import type { FormEvent } from 'react'
import type { AppData, ProductLookup } from '../../types'

export function PosSaleScreen({
  data,
  saleLines,
  setSaleLines,
  onSubmit,
  onClose,
  lookupProduct,
}: {
  data: AppData
  saleLines: number[]
  setSaleLines: (lines: number[]) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
  lookupProduct: (code: string) => Promise<ProductLookup>
}) {
  return (
    <div className="pos-fullscreen">
      <header className="pos-fullscreen-header">
        <div>
          <h1>POS</h1>
          <p>Full-screen sale desk for tablets and counters</p>
        </div>
        <button className="btn ghost pos-tap" type="button" onClick={onClose}>
          Exit POS
        </button>
      </header>
      <div className="pos-fullscreen-body">
        <SaleDrawerForm
          data={data}
          saleLines={saleLines}
          setSaleLines={setSaleLines}
          onSubmit={onSubmit}
          lookupProduct={lookupProduct}
        />
      </div>
    </div>
  )
}
