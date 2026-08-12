import { useEffect, useState } from 'react'

type ProductCodeFieldsProps = {
  editing: boolean
  initialSku?: string | null
  initialBarcode?: string | null
  fetchCodes: () => Promise<{ sku: string; barcode: string }>
}

export function ProductCodeFields({
  editing,
  initialSku,
  initialBarcode,
  fetchCodes,
}: ProductCodeFieldsProps) {
  const [sku, setSku] = useState(initialSku ?? '')
  const [barcode, setBarcode] = useState(initialBarcode ?? '')
  const [loadingCodes, setLoadingCodes] = useState(false)

  useEffect(() => {
    if (editing) {
      setSku(initialSku ?? '')
      setBarcode(initialBarcode ?? '')
      return
    }

    let active = true
    setLoadingCodes(true)

    void fetchCodes()
      .then((codes) => {
        if (!active) return
        setSku(codes.sku)
        setBarcode(codes.barcode)
      })
      .finally(() => {
        if (active) setLoadingCodes(false)
      })

    return () => {
      active = false
    }
  }, [editing, initialSku, initialBarcode, fetchCodes])

  const regenerate = async () => {
    setLoadingCodes(true)
    try {
      const codes = await fetchCodes()
      setSku(codes.sku)
      setBarcode(codes.barcode)
    } finally {
      setLoadingCodes(false)
    }
  }

  return (
    <>
      <div className="form-grid two">
        <label className="field">
          <span>SKU</span>
          <input
            className="input"
            name="sku"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            placeholder={editing ? 'Internal product code' : 'Auto-generated if left blank'}
          />
        </label>
        <label className="field">
          <span>Barcode</span>
          <input
            className="input"
            name="barcode"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            placeholder="Scan with USB scanner or type from packaging"
          />
        </label>
      </div>

      <p className="tiny code-help">
        {editing
          ? 'SKU is your internal code for reports and search. Barcode is the number on the product label or from your scanner.'
          : loadingCodes
            ? 'Generating suggested SKU and barcode…'
            : 'Leave blank to auto-generate on save, scan a packaged product barcode into the field, or click Regenerate.'}
      </p>

      {!editing && (
        <button className="btn ghost" type="button" disabled={loadingCodes} onClick={() => void regenerate()}>
          {loadingCodes ? 'Please wait' : 'Regenerate SKU & barcode'}
        </button>
      )}
    </>
  )
}
