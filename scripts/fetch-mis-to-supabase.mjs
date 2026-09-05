import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseUrl = 'https://mis.cept.gov.in/CBS/CBSReports.aspx'
const circle = 'Madhya Pradesh Circle'
const region = 'Indore Region'
const divisions = [
  'Indore City Division',
  'Indore Moffusil Division',
  'Khandwa Division',
  'Mandsaur Division',
  'Ratlam Division',
  'Sehore Division',
  'Ujjain Division',
]

const fieldNames = {
  circle: 'ctl00$ContentPlaceHolder1$CircleDropDown',
  region: 'ctl00$ContentPlaceHolder1$RegionDropDown',
  division: 'ctl00$ContentPlaceHolder1$DivisionDropDown',
  subDivision: 'ctl00$ContentPlaceHolder1$SubDivisionDropDown',
  startDate: 'ctl00$ContentPlaceHolder1$startDate',
  endDate: 'ctl00$ContentPlaceHolder1$endDate',
}

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function formatDateForMis(date) {
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()
  return `${day}-${month}-${year}`
}

function formatDateForDb(date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${date.getUTCFullYear()}-${month}-${day}`
}

function getReportDate() {
  const manualDate = process.env.REPORT_DATE
  if (manualDate) {
    const [year, month, day] = manualDate.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day))
  }

  const now = new Date()
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  const yesterdayIst = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() - 1))
  return yesterdayIst
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8377;/g, '₹')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function stripTags(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
}

function getFieldValue(html, name) {
  const pattern = new RegExp(`<input[^>]+name="${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*value="([^"]*)"`, 'i')
  return decodeHtml(html.match(pattern)?.[1] ?? '')
}

function createForm(html, reportDate) {
  return new URLSearchParams({
    __EVENTTARGET: '',
    __EVENTARGUMENT: '',
    __LASTFOCUS: '',
    __VIEWSTATE: getFieldValue(html, '__VIEWSTATE'),
    __VIEWSTATEGENERATOR: getFieldValue(html, '__VIEWSTATEGENERATOR'),
    __EVENTVALIDATION: getFieldValue(html, '__EVENTVALIDATION'),
    [fieldNames.circle]: 'Select Circle',
    [fieldNames.region]: 'Select Region',
    [fieldNames.division]: 'Select Division',
    [fieldNames.subDivision]: 'Select SubDivision',
    [fieldNames.startDate]: reportDate,
    [fieldNames.endDate]: reportDate,
  })
}

async function getPage(cookie = '') {
  const response = await fetch(baseUrl, { headers: cookie ? { cookie } : undefined })
  if (!response.ok) throw new Error(`MIS GET failed: ${response.status}`)
  return {
    html: await response.text(),
    cookie: response.headers.getSetCookie?.().map((item) => item.split(';')[0]).join('; ') ?? cookie,
  }
}

async function postForm(form, cookie) {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie,
    },
    body: form,
  })
  if (!response.ok) throw new Error(`MIS POST failed: ${response.status}`)
  return response.text()
}

function parseNumber(value) {
  const normalized = value.replace(/[,\s₹]/g, '')
  if (!normalized) return 0
  const number = Number(normalized)
  return Number.isFinite(number) ? number : 0
}

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function uniqueBy(rows, getKey) {
  const uniqueRows = new Map()
  for (const row of rows) {
    const key = getKey(row)
    if (key) uniqueRows.set(key, row)
  }
  return Array.from(uniqueRows.values())
}

function logSample(title, values, limit = 25) {
  const uniqueValues = Array.from(new Set(values.filter(Boolean))).sort()
  console.log(`${title}: ${uniqueValues.length}`)
  uniqueValues.slice(0, limit).forEach((value, index) => {
    console.log(`  ${index + 1}. ${value}`)
  })
  if (uniqueValues.length > limit) {
    console.log(`  ... ${uniqueValues.length - limit} more`)
  }
}

async function fetchAllRows(tableName, columns, orderColumns = []) {
  const pageSize = 1000
  const rows = []

  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from(tableName)
      .select(columns)
      .range(from, from + pageSize - 1)

    for (const column of orderColumns) {
      query = query.order(column)
    }

    const { data, error } = await query
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) break
  }

  return rows
}

function parseRows(html) {
  const table = html.match(/<table[^>]+id="example2"[^>]*>([\s\S]*?)<\/table>/i)?.[1] ?? ''
  return [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((row) => [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => stripTags(cell[1])))
    .filter((cells) => {
      const first = cells[0] ?? ''
      return cells.length > 0 && first !== 'Name' && first !== 'RICT Account Open' && first !== 'Total:' && cells.some(Boolean)
    })
    .map((cells) => {
      const officeName = cells[0] ?? ''
      const rictDeposit = parseNumber(cells[3] ?? '')
      const rictWithdrawal = parseNumber(cells[4] ?? '')
      return {
        office_name: officeName,
        normalized_office_name: normalizeText(officeName),
        savings_bank_accounts_opened: parseNumber(cells[2] ?? ''),
        savings_bank_transactions: rictDeposit + rictWithdrawal,
      }
    })
}

async function loadOfficeMaster() {
  const data = await fetchAllRows(
    'office_master',
    'id, division, sub_division, office_name, office_id',
    ['division', 'sub_division', 'office_name'],
  )

  if (data.length > 0) {
    console.log(`Loaded ${data.length} office master rows from Supabase.`)
    return data.map((record) => ({
      id: record.id,
      division: record.division,
      subDivision: record.sub_division,
      office: record.office_name,
      officeId: record.office_id ?? '',
    }))
  }

  const file = await fs.readFile(path.join(process.cwd(), 'public', 'data', 'indore-region-master.json'), 'utf8')
  const payload = JSON.parse(file)
  console.log(`Loaded ${payload.records.length} office master rows from bundled JSON fallback.`)
  return payload.records
}

async function upsertTransactions(rows) {
  console.log(`Upserting ${rows.length} daily transaction records.`)
  for (let index = 0; index < rows.length; index += 500) {
    const batch = rows.slice(index, index + 500)
    const { error } = await supabase
      .from('daily_office_transactions')
      .upsert(batch, { onConflict: 'report_date,office_name' })
    if (error) throw error
  }
}

async function createRun(reportDate) {
  const { data, error } = await supabase
    .from('mis_fetch_runs')
    .insert({ report_date: reportDate, status: 'running' })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function finishRun(id, status, recordsFetched, errorMessage = null) {
  const { error } = await supabase
    .from('mis_fetch_runs')
    .update({
      status,
      records_fetched: recordsFetched,
      error_message: errorMessage,
      finished_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

async function fetchAllDivisionReports(misDate) {
  const first = await getPage()
  let cookie = first.cookie
  let html = first.html

  let form = createForm(html, misDate)
  form.set(fieldNames.circle, circle)
  form.set('__EVENTTARGET', fieldNames.circle)
  html = await postForm(form, cookie)

  form = createForm(html, misDate)
  form.set(fieldNames.circle, circle)
  form.set(fieldNames.region, region)
  form.set('__EVENTTARGET', fieldNames.region)
  html = await postForm(form, cookie)

  const rows = []
  for (const division of divisions) {
    form = createForm(html, misDate)
    form.set(fieldNames.circle, circle)
    form.set(fieldNames.region, region)
    form.set(fieldNames.division, division)
    form.set('__EVENTTARGET', fieldNames.division)
    const divisionHtml = await postForm(form, cookie)

    form = createForm(divisionHtml, misDate)
    form.set(fieldNames.circle, circle)
    form.set(fieldNames.region, region)
    form.set(fieldNames.division, division)
    form.set(fieldNames.startDate, misDate)
    form.set(fieldNames.endDate, misDate)
    form.set('__EVENTTARGET', 'ctl00$ContentPlaceHolder1$ctl00')
    const reportHtml = await postForm(form, cookie)
    rows.push(...parseRows(reportHtml))
  }

  return rows
}

function buildDailyRows(masterRecords, misRows, reportDate) {
  const misLookup = new Map()
  for (const row of misRows) {
    if (!row.normalized_office_name) continue
    const existing = misLookup.get(row.normalized_office_name)
    misLookup.set(row.normalized_office_name, {
      normalized_office_name: row.normalized_office_name,
      savings_bank_accounts_opened: (existing?.savings_bank_accounts_opened ?? 0) + row.savings_bank_accounts_opened,
      savings_bank_transactions: (existing?.savings_bank_transactions ?? 0) + row.savings_bank_transactions,
    })
  }

  const masterNameLookup = new Map(masterRecords.map((office) => [normalizeText(office.office), office.office]))
  const uniqueMisRows = uniqueBy(misRows, (row) => row.normalized_office_name)
  const nonZeroMisRows = uniqueMisRows.filter((row) => row.savings_bank_accounts_opened > 0 || row.savings_bank_transactions > 0)
  const unmatchedMisOfficeNames = uniqueMisRows
    .filter((row) => !masterNameLookup.has(row.normalized_office_name))
    .map((row) => row.office_name)
  const unmatchedNonZeroMisOfficeNames = nonZeroMisRows
    .filter((row) => !masterNameLookup.has(row.normalized_office_name))
    .map((row) => row.office_name)

  const rows = masterRecords.map((office) => {
    const metrics = misLookup.get(normalizeText(office.office))
    return {
      report_date: reportDate,
      office_master_id: office.id ?? null,
      office_name: office.office,
      savings_bank_accounts_opened: metrics?.savings_bank_accounts_opened ?? 0,
      savings_bank_transactions: metrics?.savings_bank_transactions ?? 0,
      pli_rpli_premium: 0,
      speed_post_articles_booked: 0,
      parcel_articles_booked: 0,
      source: 'MIS',
      fetched_at: new Date().toISOString(),
    }
  })
  const matchedOfficeNames = rows
    .filter((row) => row.savings_bank_accounts_opened > 0 || row.savings_bank_transactions > 0)
    .map((row) => row.office_name)
  const masterOfficeNamesWithoutMis = rows
    .filter((row) => !misLookup.has(normalizeText(row.office_name)))
    .map((row) => row.office_name)

  console.log(`Unique MIS office rows parsed: ${uniqueMisRows.length}`)
  console.log(`Unique MIS office rows with non-zero savings metrics: ${nonZeroMisRows.length}`)
  console.log(`Master office rows prepared: ${rows.length}`)
  console.log(`Master office rows with matched non-zero MIS values: ${matchedOfficeNames.length}`)
  logSample('MIS office names not found in office_master', unmatchedMisOfficeNames)
  logSample('Non-zero MIS office names not found in office_master', unmatchedNonZeroMisOfficeNames)
  logSample('Master office names not returned by MIS', masterOfficeNamesWithoutMis)
  return rows
}

const reportDate = getReportDate()
const misDate = formatDateForMis(reportDate)
const dbDate = formatDateForDb(reportDate)
let runId
let recordCount = 0

try {
  runId = await createRun(dbDate)
  const masterRecords = await loadOfficeMaster()
  const misRows = await fetchAllDivisionReports(misDate)
  const rows = buildDailyRows(masterRecords, misRows, dbDate)
  recordCount = rows.length
  await upsertTransactions(rows)
  await finishRun(runId, 'success', recordCount)
  console.log(`Fetched ${misRows.length} MIS rows and stored ${recordCount} master office rows for ${dbDate}.`)
} catch (error) {
  if (runId) {
    await finishRun(runId, 'failed', recordCount, error instanceof Error ? error.message : String(error))
  }
  throw error
}
