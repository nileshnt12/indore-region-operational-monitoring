import type { ReactNode } from 'react'

export type MetricKey =
  | 'rictAccountOpen'
  | 'rictDeposit'
  | 'rictWithdrawal'
  | 'savingsBankTransaction'
  | 'totalTransaction'
  | 'totalDepositAmount'
  | 'totalWithdrawalAmount'

export interface OfficeRecord {
  circle: string
  region: string
  division: string
  subDivision: string
  officeName: string
  solId: string
  rictAccountOpen: number
  rictDeposit: number
  rictWithdrawal: number
  savingsBankTransaction: number
  totalTransaction: number
  totalDepositAmount: number
  totalWithdrawalAmount: number
}

export interface DivisionSummary {
  id: string
  name: string
  subDivisions: string[]
  officeCount: number
  rictAccountOpen: number
  rictDeposit: number
  rictWithdrawal: number
  savingsBankTransaction: number
  totalTransaction: number
  totalDepositAmount: number
  totalWithdrawalAmount: number
  activityRate: number
  netFlow: number
  status: StatusLabel
}

export interface DashboardSummary {
  totalDivisions: number
  totalSubDivisions: number
  totalOffices: number
  activeOffices: number
  totalTransaction: number
  totalDepositAmount: number
  totalWithdrawalAmount: number
  netFlow: number
  activityRate: number
  rictTotal: number
  savingsBankTransaction: number
}

export interface TrendPoint {
  date: string
  transactions: number
  deposits: number
  withdrawals: number
}

export interface DashboardDataset {
  sourceUrl: string
  circle: string
  region: string
  startDate: string
  endDate: string
  collectedAt: string
  records: OfficeRecord[]
  divisions: DivisionSummary[]
  summary: DashboardSummary
  trend: TrendPoint[]
}

export interface FilterState {
  fromDate: string
  toDate: string
  division: string
  subDivision: string
}

export type StatusLabel = 'Excellent' | 'Good' | 'Needs Attention' | 'Critical'

export interface TableColumn<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  render?: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
}
