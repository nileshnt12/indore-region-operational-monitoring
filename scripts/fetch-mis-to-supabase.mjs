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

function parseRows(html, division, reportDate, officeMaster) {
  const table = html.match(/<table[^>]+id="example2"[^>]*>([\s\S]*?)<\/table>/i)?.[1] ?? ''
  return [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((row) => [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => stripTags(cell[1])))
    .filter((cells) => {
      const first = cells[0] ?? ''
      return cells.length > 0 && first !== 'Name' && first !== 'RICT Account Open' && first !== 'Total:' && cells.some(Boolean)
    })
    .map((cells) => {
      const officeName = cells[0] ?? ''
      const matchedOffice = officeMaster.get(normalizeText(officeName))
      const rictDeposit = parseNumber(cells[3] ?? '')
      const rictWithdrawal = parseNumber(cells[4] ?? '')
      return {
        report_date: reportDate,
        office_name: matchedOffice?.office ?? officeName,
        savings_bank_accounts_opened: parseNumber(cells[2] ?? ''),
        savings_bank_transactions: rictDeposit + rictWithdrawal,
        pli_rpli_premium: 0,
        speed_post_articles_booked: 0,
        parcel_articles_booked: 0,
      }
    })
}

async function loadOfficeMaster() {
  const { data, error } = await supabase
    .from('office_master')
    .select('division, sub_division, office_name, office_id')
    .order('division')
    .order('sub_division')
    .order('office_name')

  if (!error && data && data.length > 0) {
    return data.map((record) => ({
      division: record.division,
      subDivision: record.sub_division,
      office: record.office_name,
      officeId: record.office_id ?? '',
    }))
  }

  const file = await fs.readFile(path.join(process.cwd(), 'public', 'data', 'indore-region-master.json'), 'utf8')
  const payload = JSON.parse(file)
  return payload.records
}

async function upsertTransactions(rows) {
  const uniqueRows = uniqueBy(rows, (row) => `${row.report_date}:${normalizeText(row.office_name)}`)
  console.log(`Upserting ${uniqueRows.length} unique transaction records from ${rows.length} fetched rows.`)
  for (let index = 0; index < uniqueRows.length; index += 500) {
    const batch = uniqueRows.slice(index, index + 500)
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

async function fetchAllDivisionReports(misDate, dbDate, officeMaster) {
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
    rows.push(...parseRows(reportHtml, division, dbDate, officeMaster))
  }

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
  const officeMaster = new Map(masterRecords.map((record) => [normalizeText(record.office), record]))
  const rows = await fetchAllDivisionReports(misDate, dbDate, officeMaster)
  recordCount = uniqueBy(rows, (row) => `${row.report_date}:${normalizeText(row.office_name)}`).length
  await upsertTransactions(rows)
  await finishRun(runId, 'success', recordCount)
  console.log(`Fetched and stored ${recordCount} records for ${dbDate}.`)
} catch (error) {
  if (runId) {
    await finishRun(runId, 'failed', recordCount, error instanceof Error ? error.message : String(error))
  }
  throw error
}
