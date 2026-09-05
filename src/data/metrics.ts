import { Building2, IndianRupee, Landmark, Network, Repeat2, WalletCards } from 'lucide-react'
import type { DashboardSummary } from '../types/dashboard'
import { formatCurrency, formatNumber, formatPercentage } from '../utils/numberUtils'

export const kpiConfig = [
  {
    key: 'totalDivisions',
    label: 'Total Divisions',
    icon: Landmark,
    value: (summary: DashboardSummary) => formatNumber(summary.totalDivisions),
    detail: 'Indore Region reporting units',
  },
  {
    key: 'totalOffices',
    label: 'Reporting Offices',
    icon: Building2,
    value: (summary: DashboardSummary) => formatNumber(summary.totalOffices),
    detail: (summary: DashboardSummary) => `${formatNumber(summary.activeOffices)} offices with activity`,
  },
  {
    key: 'totalTransaction',
    label: 'Total Transactions',
    icon: Repeat2,
    value: (summary: DashboardSummary) => formatNumber(summary.totalTransaction),
    detail: 'Counter and RICT combined',
  },
  {
    key: 'savingsBankTransaction',
    label: 'Savings Bank Transaction',
    icon: Network,
    value: (summary: DashboardSummary) => formatNumber(summary.savingsBankTransaction),
    detail: 'RICT deposit + RICT withdrawal',
  },
  {
    key: 'totalDepositAmount',
    label: 'Deposit Amount',
    icon: IndianRupee,
    value: (summary: DashboardSummary) => formatCurrency(summary.totalDepositAmount),
    detail: 'Total deposit value',
  },
  {
    key: 'netFlow',
    label: 'Net Deposit Flow',
    icon: WalletCards,
    value: (summary: DashboardSummary) => formatCurrency(summary.netFlow),
    detail: (summary: DashboardSummary) => `${formatPercentage(summary.activityRate)} activity rate`,
  },
]
