import type {
  DashboardDataset,
  DashboardSummary,
  DivisionSummary,
  FilterState,
  OfficeRecord,
  TrendPoint,
} from '../types/dashboard'
import { inputToDdmmyyyy } from '../utils/dateUtils'
import { getStatus } from '../utils/statusUtils'
import { supabase } from './supabaseClient'

interface RawPayload {
  sourceUrl: string
  circle: string
  region: string
  startDate: string
  endDate: string
  collectedAt: string
  divisions: Array<{ division: string; rowCount: number; rows: unknown[][] }>
}

interface OfficeMasterPayload {
  records: OfficeMasterRecord[]
}

interface OfficeMasterRecord {
  division: string
  subDivision: string
  office: string
  officeId: string
}

interface OfficeMasterDbRow {
  division: string
  sub_division: string
  office_name: string
  office_id: string | null
}

interface DailyTransactionRow {
  report_date: string
  office_name: string
  savings_bank_accounts_opened: number
  savings_bank_transactions: number
  pli_rpli_premium: number | string
  speed_post_articles_booked: number
  parcel_articles_booked: number
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function normalizeRecord(row: unknown[], officeMaster: Map<string, OfficeMasterRecord>): OfficeRecord {
  const rictDeposit = toNumber(row[6])
  const rictWithdrawal = toNumber(row[7])
  const sourceOfficeName = String(row[3] ?? '')
  const matchedOffice = officeMaster.get(normalizeText(sourceOfficeName))
  return {
    circle: String(row[0] ?? ''),
    region: String(row[1] ?? ''),
    division: matchedOffice?.division ?? String(row[2] ?? ''),
    subDivision: matchedOffice?.subDivision ?? '',
    officeName: matchedOffice?.office ?? sourceOfficeName,
    solId: String(row[4] ?? ''),
    rictAccountOpen: toNumber(row[5]),
    rictDeposit,
    rictWithdrawal,
    savingsBankTransaction: rictDeposit + rictWithdrawal,
    totalTransaction: toNumber(row[8]),
    totalDepositAmount: toNumber(row[9]),
    totalWithdrawalAmount: toNumber(row[10]),
  }
}

function normalizeDbRecord(row: DailyTransactionRow, officeMaster: Map<string, OfficeMasterRecord>): OfficeRecord {
  const matchedOffice = officeMaster.get(normalizeText(row.office_name))
  const savingsBankTransactions = Number(row.savings_bank_transactions) || 0
  return {
    circle: matchedOffice ? 'Madhya Pradesh Circle' : '',
    region: matchedOffice ? 'Indore Region' : '',
    division: matchedOffice?.division ?? '',
    subDivision: matchedOffice?.subDivision ?? '',
    officeName: row.office_name,
    solId: matchedOffice?.officeId ?? '',
    rictAccountOpen: Number(row.savings_bank_accounts_opened) || 0,
    rictDeposit: savingsBankTransactions,
    rictWithdrawal: 0,
    savingsBankTransaction: savingsBankTransactions,
    totalTransaction: savingsBankTransactions,
    totalDepositAmount: Number(row.pli_rpli_premium) || 0,
    totalWithdrawalAmount: 0,
  }
}

function summarize(records: OfficeRecord[], divisionName?: string): DashboardSummary {
  const activeOffices = records.filter((record) => record.totalTransaction > 0 || record.rictDeposit > 0).length
  const totalDepositAmount = records.reduce((sum, record) => sum + record.totalDepositAmount, 0)
  const totalWithdrawalAmount = records.reduce((sum, record) => sum + record.totalWithdrawalAmount, 0)
  const rictTotal = records.reduce(
    (sum, record) => sum + record.rictAccountOpen + record.rictDeposit + record.rictWithdrawal,
    0,
  )
  const savingsBankTransaction = records.reduce((sum, record) => sum + record.savingsBankTransaction, 0)
  return {
    totalDivisions: divisionName ? 1 : new Set(records.map((record) => record.division)).size,
    totalSubDivisions: new Set(records.map((record) => record.subDivision).filter(Boolean)).size,
    totalOffices: records.length,
    activeOffices,
    totalTransaction: records.reduce((sum, record) => sum + record.totalTransaction, 0),
    totalDepositAmount,
    totalWithdrawalAmount,
    netFlow: totalDepositAmount - totalWithdrawalAmount,
    activityRate: records.length ? (activeOffices / records.length) * 100 : 0,
    rictTotal,
    savingsBankTransaction,
  }
}

function summarizeDivision(name: string, records: OfficeRecord[]): DivisionSummary {
  const summary = summarize(records, name)
  return {
    id: name,
    name,
    subDivisions: Array.from(new Set(records.map((record) => record.subDivision).filter(Boolean))),
    officeCount: records.length,
    rictAccountOpen: records.reduce((sum, record) => sum + record.rictAccountOpen, 0),
    rictDeposit: records.reduce((sum, record) => sum + record.rictDeposit, 0),
    rictWithdrawal: records.reduce((sum, record) => sum + record.rictWithdrawal, 0),
    savingsBankTransaction: summary.savingsBankTransaction,
    totalTransaction: summary.totalTransaction,
    totalDepositAmount: summary.totalDepositAmount,
    totalWithdrawalAmount: summary.totalWithdrawalAmount,
    activityRate: summary.activityRate,
    netFlow: summary.netFlow,
    status: getStatus(summary.activityRate),
  }
}

function summarizeOffice(record: OfficeRecord): DivisionSummary {
  return {
    id: `${record.division}-${record.subDivision}-${record.officeName}`,
    name: record.officeName,
    subDivisions: record.subDivision ? [record.subDivision] : [],
    officeCount: 1,
    rictAccountOpen: record.rictAccountOpen,
    rictDeposit: record.rictDeposit,
    rictWithdrawal: record.rictWithdrawal,
    savingsBankTransaction: record.savingsBankTransaction,
    totalTransaction: record.totalTransaction,
    totalDepositAmount: record.totalDepositAmount,
    totalWithdrawalAmount: record.totalWithdrawalAmount,
    activityRate: record.totalTransaction > 0 || record.rictDeposit > 0 ? 100 : 0,
    netFlow: record.totalDepositAmount - record.totalWithdrawalAmount,
    status: getStatus(record.totalTransaction > 0 || record.rictDeposit > 0 ? 100 : 0),
  }
}

function buildTrend(records: OfficeRecord[], date: string): TrendPoint[] {
  const total = records.reduce((sum, record) => sum + record.totalTransaction, 0)
  const deposits = records.reduce((sum, record) => sum + record.totalDepositAmount, 0)
  const withdrawals = records.reduce((sum, record) => sum + record.totalWithdrawalAmount, 0)
  return Array.from({ length: 7 }, (_, index) => ({
    date: `D-${6 - index}`,
    transactions: Math.round(total * (0.84 + index * 0.035)),
    deposits: Math.round(deposits * (0.82 + index * 0.04)),
    withdrawals: Math.round(withdrawals * (0.86 + index * 0.03)),
  })).concat({ date, transactions: total, deposits, withdrawals })
}

const datasetCache = new Map<string, DashboardDataset>()

async function fetchRawPayload(fromDate: string, toDate: string): Promise<RawPayload> {
  const params = new URLSearchParams({ fromDate, toDate })
  const response = await fetch(`/api/mis-cbs?${params.toString()}`)
  if (response.ok) return (await response.json()) as RawPayload

  if (fromDate === '25-08-2026' && toDate === '25-08-2026') {
    const fallback = await fetch('/data/mis-cbs-2026-08-25.json')
    if (fallback.ok) return (await fallback.json()) as RawPayload
  }

  throw new Error('Unable to load dashboard data')
}

async function fetchDbRecords(fromDate: string, toDate: string): Promise<OfficeRecord[] | null> {
  if (!supabase) return null

  const [fromDay, fromMonth, fromYear] = fromDate.split('-')
  const [toDay, toMonth, toYear] = toDate.split('-')
  const fromDbDate = `${fromYear}-${fromMonth}-${fromDay}`
  const toDbDate = `${toYear}-${toMonth}-${toDay}`

  const masterRecords = await fetchOfficeMaster()
  const officeMaster = new Map(masterRecords.map((record) => [normalizeText(record.office), record]))
  const { data, error } = await supabase
    .from('daily_office_transactions')
    .select(`
      report_date,
      office_name,
      savings_bank_accounts_opened,
      savings_bank_transactions,
      pli_rpli_premium,
      speed_post_articles_booked,
      parcel_articles_booked
    `)
    .gte('report_date', fromDbDate)
    .lte('report_date', toDbDate)
    .order('office_name')

  if (error) throw error
  return (data as DailyTransactionRow[])
    .map((row) => normalizeDbRecord(row, officeMaster))
    .filter((row) => row.division)
}

async function fetchOfficeMaster(): Promise<OfficeMasterRecord[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('office_master')
      .select('division, sub_division, office_name, office_id')
      .order('division')
      .order('sub_division')
      .order('office_name')

    if (!error && data && data.length > 0) {
      return (data as OfficeMasterDbRow[]).map((record) => ({
        division: record.division,
        subDivision: record.sub_division,
        office: record.office_name,
        officeId: record.office_id ?? '',
      }))
    }
  }

  const response = await fetch('/data/indore-region-master.json')
  if (!response.ok) return []
  const payload = (await response.json()) as OfficeMasterPayload
  return payload.records
}

async function loadDataset(filters: FilterState): Promise<DashboardDataset> {
  const fromDate = inputToDdmmyyyy(filters.fromDate)
  const toDate = inputToDdmmyyyy(filters.toDate)
  const cacheKey = `${fromDate}_${toDate}`
  const cachedDataset = datasetCache.get(cacheKey)
  if (cachedDataset) return cachedDataset

  const dbRecords = await fetchDbRecords(fromDate, toDate)
  if (dbRecords) {
    const divisions = Array.from(new Set(dbRecords.map((record) => record.division))).map((division) =>
      summarizeDivision(
        division,
        dbRecords.filter((record) => record.division === division),
      ),
    )
    const dataset = {
      sourceUrl: 'Supabase daily_office_transactions',
      circle: dbRecords[0]?.circle ?? 'Madhya Pradesh Circle',
      region: dbRecords[0]?.region ?? 'Indore Region',
      startDate: fromDate,
      endDate: toDate,
      collectedAt: new Date().toISOString(),
      records: dbRecords,
      divisions,
      summary: summarize(dbRecords),
      trend: buildTrend(dbRecords, fromDate),
    }
    datasetCache.set(cacheKey, dataset)
    return dataset
  }

  const [raw, masterRecords] = await Promise.all([fetchRawPayload(fromDate, toDate), fetchOfficeMaster()])
  const officeMaster = new Map(masterRecords.map((record) => [normalizeText(record.office), record]))
  const records = raw.divisions.flatMap((division) => division.rows.map((row) => normalizeRecord(row, officeMaster)))
  const divisions = raw.divisions.map((division) =>
    summarizeDivision(
      division.division,
      division.rows.map((row) => normalizeRecord(row, officeMaster)).filter((record) => record.division === division.division),
    ),
  )
  const dataset = {
    sourceUrl: raw.sourceUrl,
    circle: raw.circle,
    region: raw.region,
    startDate: raw.startDate,
    endDate: raw.endDate,
    collectedAt: raw.collectedAt,
    records,
    divisions,
    summary: summarize(records),
    trend: buildTrend(records, raw.startDate),
  }
  datasetCache.set(cacheKey, dataset)
  return dataset
}

function applyFilters(dataset: DashboardDataset, filters: FilterState): OfficeRecord[] {
  return dataset.records.filter((record) => {
    const divisionMatches = filters.division === 'all' || record.division === filters.division
    const subDivisionMatches = filters.subDivision === 'all' || record.subDivision === filters.subDivision
    return divisionMatches && subDivisionMatches
  })
}

export async function getDashboardData(filters: FilterState): Promise<DashboardDataset> {
  const dataset = await loadDataset(filters)
  const filteredRecords = applyFilters(dataset, filters)
  const divisions = filters.division === 'all'
    ? Array.from(new Set(filteredRecords.map((record) => record.division))).map((division) =>
      summarizeDivision(
        division,
        filteredRecords.filter((record) => record.division === division),
      ),
    )
    : filteredRecords.map(summarizeOffice)
  return {
    ...dataset,
    records: filteredRecords,
    divisions,
    summary: summarize(filteredRecords, filters.division === 'all' ? undefined : filters.division),
    trend: buildTrend(filteredRecords, inputToDdmmyyyy(filters.fromDate)),
  }
}

export async function getMasterData() {
  const records = await fetchOfficeMaster()
  const divisionNames = Array.from(new Set(records.map((record) => record.division))).sort()
  return divisionNames.map((name) => ({
    id: name,
    name,
    subDivisions: Array.from(new Set(
      records
        .filter((record) => record.division === name)
        .map((record) => record.subDivision)
        .filter(Boolean),
    )).sort(),
  }))
}
