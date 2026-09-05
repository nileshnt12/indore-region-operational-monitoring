export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value ?? 0)
}

export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'INR',
  }).format(value ?? 0)
}

export function formatPercentage(value: number | null | undefined): string {
  return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value ?? 0)}%`
}
