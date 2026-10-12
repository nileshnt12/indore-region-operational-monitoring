export function toInputDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getYesterday(): string {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return toInputDate(date)
}

export function ddmmyyyyToInput(value: string): string {
  const [day, month, year] = value.split('-')
  return `${year}-${month}-${day}`
}

export function inputToDdmmyyyy(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}-${month}-${year}`
}

export function formatDisplayDate(value: string): string {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

export function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

export function validateDateRange(fromDate: string, toDate: string): string | null {
  if (!fromDate || !toDate) return 'Both date fields are required.'
  if (fromDate > toDate) return 'From Date cannot be greater than To Date.'
  return null
}
