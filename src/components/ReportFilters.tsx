import { CalendarDays, RotateCcw, Search } from 'lucide-react'
import type { FilterState } from '../types/dashboard'

interface MasterDivision {
  id: string
  name: string
  subDivisions: string[]
}

interface Props {
  filters: FilterState
  validationMessage: string | null
  divisions: MasterDivision[]
  onChange: (filters: FilterState) => void
  onApply: () => void
  onReset: () => void
}

export function ReportFilters({ filters, validationMessage, divisions, onChange, onApply, onReset }: Props) {
  const selectedDivision = divisions.find((division) => division.name === filters.division)
  const subDivisions = selectedDivision?.subDivisions ?? []

  return (
    <section className="panel filter-panel">
      <div className="section-heading">
        <div>
          <h2>Report Filters</h2>
          <p>Select report period and organizational unit</p>
        </div>
      </div>
      <div className="filter-grid">
        <label>
          From Date
          <input
            type="date"
            required
            value={filters.fromDate}
            onChange={(event) => onChange({ ...filters, fromDate: event.target.value })}
          />
        </label>
        <label>
          To Date
          <input
            type="date"
            required
            value={filters.toDate}
            onChange={(event) => onChange({ ...filters, toDate: event.target.value })}
          />
        </label>
        <label>
          Division
          <select
            value={filters.division}
            onChange={(event) => onChange({ ...filters, division: event.target.value, subDivision: 'all' })}
          >
            <option value="all">All Divisions</option>
            {divisions.map((division) => (
              <option key={division.id} value={division.name}>{division.name}</option>
            ))}
          </select>
        </label>
        <label>
          Sub-Division
          <select
            value={filters.subDivision}
            disabled={filters.division === 'all'}
            onChange={(event) => onChange({ ...filters, subDivision: event.target.value })}
          >
            <option value="all">All Sub-Divisions</option>
            {subDivisions.map((subDivision) => (
              <option key={subDivision} value={subDivision}>{subDivision}</option>
            ))}
          </select>
        </label>
        <button className="primary-button" type="button" onClick={onApply} disabled={Boolean(validationMessage)}>
          <Search size={17} />
          View Report
        </button>
        <button className="secondary-button" type="button" onClick={onReset}>
          <RotateCcw size={17} />
          Reset
        </button>
      </div>
      {validationMessage ? (
        <div className="validation-message" role="alert">
          <CalendarDays size={16} />
          {validationMessage}
        </div>
      ) : null}
    </section>
  )
}
