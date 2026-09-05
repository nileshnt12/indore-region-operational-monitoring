import { useEffect, useMemo, useState } from 'react'
import { BarChart3, DatabaseZap, FileText, Home, LogOut, Search, ShieldCheck } from 'lucide-react'
import { AttentionPanel } from '../components/AttentionPanel'
import { Breadcrumb } from '../components/Breadcrumb'
import { DataTable } from '../components/DataTable'
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/StateViews'
import { Header } from '../components/Header'
import { MasterDataUpload } from '../components/MasterDataUpload'
import { ReportFilters } from '../components/ReportFilters'
import { getDashboardData, getMasterData } from '../services/dashboardService'
import type { DashboardDataset, FilterState } from '../types/dashboard'
import { formatDateTime, getYesterday, inputToDdmmyyyy, validateDateRange } from '../utils/dateUtils'
import { downloadCsv } from '../utils/exportUtils'

const defaultReportDate = getYesterday()

interface DashboardProps {
  userId: string
  onSignOut: () => void
}

export function Dashboard({ userId, onSignOut }: DashboardProps) {
  const [activeView, setActiveView] = useState<'dashboard' | 'master-data'>('dashboard')
  const [filters, setFilters] = useState<FilterState>({
    fromDate: defaultReportDate,
    toDate: defaultReportDate,
    division: 'all',
    subDivision: 'all',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [dataset, setDataset] = useState<DashboardDataset | null>(null)
  const [masterData, setMasterData] = useState<Array<{ id: string; name: string; subDivisions: string[] }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(formatDateTime(new Date()))

  const validationMessage = useMemo(() => validateDateRange(filters.fromDate, filters.toDate), [filters])

  async function loadMasterData() {
    try {
      const masters = await getMasterData()
      setMasterData(masters)
    } catch (err) {
      console.error(err)
      setMasterData([])
    }
  }

  async function loadData(nextFilters = appliedFilters) {
    setLoading(true)
    setError(false)
    try {
      const data = await getDashboardData(nextFilters)
      setDataset(data)
      setLastUpdated(formatDateTime(new Date()))
    } catch (err) {
      console.error(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    document.title = 'Indore Region Operational Monitoring | India Post'
    void loadMasterData()
    void loadData(filters)
  }, [])

  function applyFilters() {
    if (validationMessage) return
    setAppliedFilters(filters)
    void loadData(filters)
  }

  function resetFilters() {
    const next = { fromDate: defaultReportDate, toDate: defaultReportDate, division: 'all', subDivision: 'all' }
    setFilters(next)
    setAppliedFilters(next)
    void loadData(next)
  }

  function viewDivision(division: string) {
    const next = { ...filters, division, subDivision: 'all' }
    setFilters(next)
    setAppliedFilters(next)
    void loadData(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function exportCurrentView() {
    if (!dataset) return
    const datePart = appliedFilters.fromDate === appliedFilters.toDate
      ? inputToDdmmyyyy(appliedFilters.fromDate)
      : `${inputToDdmmyyyy(appliedFilters.fromDate)}_to_${inputToDdmmyyyy(appliedFilters.toDate)}`
    downloadCsv(dataset.records, `Indore_Region_Operational_Monitoring_${datePart}.csv`)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo-wrap">
          <img src="/assets/dop-dak-sewa-jan-sewa-logo.webp" alt="India Post Dak Sewa Jan Sewa" />
        </div>
        <div className="sidebar-title">
          <span>Department of Posts</span>
          <strong>Operational Monitoring</strong>
        </div>
        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          <button className={activeView === 'dashboard' ? 'active' : undefined} type="button" onClick={() => setActiveView('dashboard')}><Home size={17} /> Dashboard</button>
          <button type="button" onClick={() => { setActiveView('dashboard'); document.getElementById('filters')?.scrollIntoView({ behavior: 'smooth' }) }}><Search size={17} /> Report Filters</button>
          <button type="button" onClick={() => { setActiveView('dashboard'); document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' }) }}><FileText size={17} /> Division Report</button>
          <button type="button" onClick={() => { setActiveView('dashboard'); document.getElementById('attention')?.scrollIntoView({ behavior: 'smooth' }) }}><BarChart3 size={17} /> Attention Units</button>
          <button className={activeView === 'master-data' ? 'active' : undefined} type="button" onClick={() => setActiveView('master-data')}><DatabaseZap size={17} /> Create/Update Master Data</button>
          <button type="button" onClick={() => setActiveView('master-data')}><ShieldCheck size={17} /> Admin View</button>
        </nav>
        <div className="sidebar-user">
          <span>{userId}</span>
          <small>Administrator</small>
          <button type="button" onClick={onSignOut}><LogOut size={15} /> Sign out</button>
        </div>
      </aside>
      <div className="content-shell">
      <Header lastUpdated={lastUpdated} loading={loading} onRefresh={() => void loadData()} />
      <main>
        {activeView === 'dashboard' ? (
          <>
            <div className="page-heading">
              <Breadcrumb
                division={appliedFilters.division}
                subDivision={appliedFilters.subDivision}
                onRegion={() => viewDivision('all')}
                onDivision={() => setFilters((value) => ({ ...value, subDivision: 'all' }))}
              />
              <div>
                <h2>Dashboard / Indore Region</h2>
                <p>Report Period: {inputToDdmmyyyy(appliedFilters.fromDate)} to {inputToDdmmyyyy(appliedFilters.toDate)}</p>
              </div>
            </div>
            <div id="filters">
            <ReportFilters
              filters={filters}
              validationMessage={validationMessage}
              divisions={masterData}
              onChange={setFilters}
              onApply={applyFilters}
              onReset={resetFilters}
            />
            </div>
            {loading && <LoadingSkeleton />}
            {error && <ErrorState onRetry={() => void loadData()} />}
            {!loading && !error && dataset && (
              <>
                {dataset.records.length === 0 ? (
                  <EmptyState />
                ) : (
                  <>
                    <DataTable
                      id="report"
                      title={appliedFilters.division === 'all' ? 'Division Wise Operational Report' : `Sub-Division Wise Operational Report - ${appliedFilters.division}`}
                      nameLabel={appliedFilters.division === 'all' ? 'Division' : 'Office'}
                      rows={dataset.divisions}
                      officeRows={dataset.records}
                      showAction={appliedFilters.division === 'all'}
                      onViewDivision={viewDivision}
                      onExport={exportCurrentView}
                    />
                    <div id="attention">
                    <AttentionPanel divisions={dataset.divisions} />
                    </div>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className="page-heading">
              <Breadcrumb
                division="Create/Update Master Data"
                subDivision="all"
                onRegion={() => setActiveView('dashboard')}
                onDivision={() => undefined}
              />
              <div>
                <h2>Admin / Office Master</h2>
                <p>Replace office master data from an uploaded Office_Master file</p>
              </div>
            </div>
            <MasterDataUpload onUpdated={() => void loadMasterData()} />
          </>
        )}
      </main>
      <footer>Department of Posts | Indore Region · Indore Region Operational Monitoring</footer>
      </div>
    </div>
  )
}
