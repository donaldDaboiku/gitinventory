export function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : null
  } catch {
    return null
  }
}

export function normalizePayload(form: HTMLFormElement) {
  const payload = Object.fromEntries(new FormData(form).entries())
  const numeric = new Set([
    'quantity',
    'new_quantity',
    'cost_price',
    'selling_price',
    'min_stock_level',
    'amount_paid',
    'discount_amount',
    'unit_cost',
    'credit_limit',
    'quantity_ordered',
    'quantity_received',
    'unit_price',
  ])

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (value === '') return [key, null]
      if (numeric.has(key)) return [key, Number(value)]
      return [key, value]
    }),
  )
}

export function formatDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : undefined
}

export function collectTransactionItems(form: HTMLFormElement, purchase = false) {
  return [...form.querySelectorAll<HTMLElement>('[data-line]')].map((line) => {
    const values = Object.fromEntries(
      [...line.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select')].map((field) => [
        field.name,
        field.value,
      ]),
    )

    if (purchase) {
      return {
        product_id: values.product_id,
        quantity_ordered: Number(values.quantity_ordered),
        quantity_received: Number(values.quantity_received),
        unit_cost: Number(values.unit_cost),
      }
    }

    return {
      product_id: values.product_id,
      quantity: Number(values.quantity),
      unit_price: Number(values.unit_price),
      discount: 0,
    }
  })
}
