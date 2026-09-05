import type { OfficeRecord } from '../types/dashboard'

const exportHeaders = [
  'Division',
  'Office Name',
  'SOL ID / BOCODE',
  'RICT Account Open',
  'RICT Deposit',
  'RICT Withdrawal',
  'Savings Bank Transaction',
  'Total Transaction',
  'Total Deposit Amount',
  'Total Withdrawal Amount',
]

export function downloadCsv(records: OfficeRecord[], fileName: string): void {
  const rows = records.map((record) => [
    record.division,
    record.officeName,
    record.solId,
    record.rictAccountOpen,
    record.rictDeposit,
    record.rictWithdrawal,
    record.savingsBankTransaction,
    record.totalTransaction,
    record.totalDepositAmount,
    record.totalWithdrawalAmount,
  ])
  const csv = [exportHeaders, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
