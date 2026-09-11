import * as XLSX from 'xlsx'
import type { OfficeMasterUploadRow } from '../types/masterData'

const requiredColumns = [
  'Circle',
  'Region',
  'Division',
  'Divisional Head',
  'Divisional Head Mobile',
  'Sub Division',
  'Sub Divisional Head',
  'Sub Divisional Head Mobile',
  'Office Name',
  'Alternate Office Name',
  'office_id',
  'email ID',
  'office_type_desc',
  'pincode',
] as const

const columnMap: Record<string, keyof OfficeMasterUploadRow> = {
  circle: 'circle',
  region: 'region',
  division: 'division',
  divisionalhead: 'divisional_head',
  divisionalheadmobile: 'divisional_head_mobile',
  subdivision: 'sub_division',
  subdivisionalhead: 'sub_divisional_head',
  subdivisionalheadmobile: 'sub_divisional_head_mobile',
  officename: 'office_name',
  alternateofficename: 'alternate_office_name',
  officeid: 'office_id',
  emailid: 'email_id',
  officetypedesc: 'office_type_desc',
  pincode: 'pincode',
}

export interface ParsedMasterData {
  rows: OfficeMasterUploadRow[]
  missingColumns: string[]
  sheetName: string
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function readCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

export async function parseOfficeMasterFile(file: File): Promise<ParsedMasterData> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  const isCsv = file.name.toLowerCase().endsWith('.csv')
  const sheetName = isCsv ? workbook.SheetNames[0] : 'Office_Master'
  const worksheet = workbook.Sheets[sheetName]

  if (!worksheet) {
    return { rows: [], missingColumns: [`Sheet "Office_Master"`], sheetName }
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  })
  const headers = Object.keys(rawRows[0] ?? {})
  const headerLookup = new Map(headers.map((header) => [normalizeHeader(header), header]))
  const missingColumns = requiredColumns.filter((column) => !headerLookup.has(normalizeHeader(column)))

  if (missingColumns.length > 0) {
    return { rows: [], missingColumns, sheetName }
  }

  const rows = rawRows
    .map((rawRow) => {
      const row = {} as OfficeMasterUploadRow
      for (const [normalizedHeader, key] of Object.entries(columnMap)) {
        const sourceHeader = headerLookup.get(normalizedHeader)
        row[key] = readCell(sourceHeader ? rawRow[sourceHeader] : '')
      }
      return row
    })
    .filter((row) => row.office_name && row.division && row.sub_division)

  return { rows, missingColumns: [], sheetName }
}
