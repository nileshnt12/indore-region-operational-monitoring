import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { defineConfig, type Plugin } from 'vite'

const baseUrl = 'https://mis.cept.gov.in/CBS/CBSReports.aspx'
const divisionNames = [
  'Indore City Division',
  'Indore Moffusil Division',
  'Khandwa Division',
  'Mandsaur Division',
  'Ratlam Division',
  'Sehore Division',
  'Ujjain Division',
]
const execFileAsync = promisify(execFile)
const inFlightFetches = new Map<string, Promise<void>>()

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8377;/g, '₹')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
}

function parseNumber(value: string): number | null {
  const text = value.replace(/[,\s₹]/g, '')
  if (!text) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

function parseRows(html: string, division: string) {
  const table = html.match(/<table[^>]+id="example2"[^>]*>([\s\S]*?)<\/table>/i)?.[1] ?? ''
  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  return rows
    .map((row) => [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => stripTags(cell[1])))
    .filter((cells) => {
      const first = cells[0] ?? ''
      return cells.length > 0 && first !== 'Name' && first !== 'RICT Account Open' && first !== 'Total:' && cells.some(Boolean)
    })
    .map((cells) => [
      'Madhya Pradesh Circle',
      'Indore Region',
      division,
      cells[0] ?? '',
      cells[1] ?? '',
      parseNumber(cells[2] ?? ''),
      parseNumber(cells[3] ?? ''),
      parseNumber(cells[4] ?? ''),
      parseNumber(cells[5] ?? ''),
      parseNumber(cells[6] ?? ''),
      parseNumber(cells[7] ?? ''),
    ])
}

async function htmlReportsExist(outputDir: string): Promise<boolean> {
  const checks = await Promise.all(
    divisionNames.map(async (division) => {
      const fileName = `${division.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}.html`
      try {
        const stat = await fs.stat(path.join(outputDir, fileName))
        return stat.size > 1000
      } catch {
        return false
      }
    }),
  )
  return checks.every(Boolean)
}

async function ensureHtmlReports(fromDate: string, toDate: string, outputDir: string): Promise<void> {
  if (await htmlReportsExist(outputDir)) return
  const key = `${fromDate}_${toDate}`
  const existing = inFlightFetches.get(key)
  if (existing) {
    await existing
    return
  }
  const run = execFileAsync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    path.join(process.cwd(), 'scripts', 'fetch-mis-html.ps1'),
    '-FromDate',
    fromDate,
    '-ToDate',
    toDate,
    '-OutDir',
    outputDir,
  ], { timeout: 180000 }).then(() => undefined)
  inFlightFetches.set(key, run)
  try {
    await run
  } finally {
    inFlightFetches.delete(key)
  }
}

function misApiPlugin(): Plugin {
  return {
    name: 'mis-cbs-api',
    configureServer(server) {
      server.middlewares.use('/api/mis-cbs', async (req, res) => {
        try {
          const requestUrl = new URL(req.url ?? '', 'http://localhost')
          const fromDate = requestUrl.searchParams.get('fromDate') ?? ''
          const toDate = requestUrl.searchParams.get('toDate') ?? fromDate
          if (!fromDate || !toDate) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'fromDate and toDate are required' }))
            return
          }

          const outputDir = path.join('D:/Monitoring/outputs/dashboard_mis_cache', `${fromDate}_to_${toDate}`.replace(/[^0-9A-Za-z_-]/g, '_'))
          await fs.mkdir(outputDir, { recursive: true })
          await ensureHtmlReports(fromDate, toDate, outputDir)

          const divisions = []
          for (const division of divisionNames) {
            const fileName = `${division.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}.html`
            const divisionHtml = await fs.readFile(path.join(outputDir, fileName), 'utf8')
            const rows = parseRows(divisionHtml, division)
            divisions.push({ division, rowCount: rows.length, rows })
          }

          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({
            sourceUrl: baseUrl,
            circle: 'Madhya Pradesh Circle',
            region: 'Indore Region',
            startDate: fromDate,
            endDate: toDate,
            collectedAt: new Date().toISOString(),
            divisions,
          }))
        } catch (error) {
          server.config.logger.error(error instanceof Error ? error.message : String(error))
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'Unable to fetch MIS report' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [misApiPlugin(), react(), tailwindcss()],
})
