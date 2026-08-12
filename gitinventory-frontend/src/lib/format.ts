export type MoneyFormatter = (value: string | number | undefined) => string

export function createMoneyFormatter(currency = 'NGN'): MoneyFormatter {
  return (value) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(value || 0))
}
