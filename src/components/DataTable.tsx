import { ArrowDownUp, Download, Eye, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DivisionSummary, OfficeRecord, TableColumn } from '../types/dashboard'
import { formatCurrency, formatNumber, formatPercentage } from '../utils/numberUtils'
import { StatusBadge } from './StatusBadge'

interface Props {
  id?: string
  title: string
  nameLabel?: string
  rows: DivisionSummary[]
  officeRows: OfficeRecord[]
  showAction?: boolean
  onViewDivision: (division: string) => void
  onExport: () => void
}

const pageSizes = [10, 25, 50, 100]

export function DataTable({ id, title, nameLabel = 'Division', rows, officeRows, showAction = true, onViewDivision, onExport }: Props) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<string>('totalTransaction')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const actionColumn: TableColumn<DivisionSummary> = {
    key: 'action',
    label: 'Action',
    align: 'center',
    render: (row) => (
      <button className="table-action" type="button" onClick={() => onViewDivision(row.name)} aria-label={`View ${row.name}`}>
        <Eye size={15} />
        View
      </button>
    ),
  }

  const columns: TableColumn<DivisionSummary>[] = [
    { key: 'name', label: nameLabel, sortable: true },
    { key: 'officeCount', label: 'Offices', sortable: true, align: 'right', render: (row) => formatNumber(row.officeCount) },
    { key: 'rictAccountOpen', label: 'Savings Bank Account Open', sortable: true, align: 'right', render: (row) => formatNumber(row.rictAccountOpen) },
    { key: 'savingsBankTransaction', label: 'Savings Bank Transaction', sortable: true, align: 'right', render: (row) => formatNumber(row.savingsBankTransaction) },
    { key: 'totalDepositAmount', label: 'Deposit Amount', sortable: true, align: 'right', render: (row) => formatCurrency(row.totalDepositAmount) },
    { key: 'activityRate', label: 'Activity %', sortable: true, align: 'right', render: (row) => formatPercentage(row.activityRate) },
    { key: 'status', label: 'Status', align: 'center', render: (row) => <StatusBadge status={row.status} /> },
    ...(showAction ? [actionColumn] : []),
  ]

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const result = rows.filter((row) => row.name.toLowerCase().includes(normalized))
    result.sort((a, b) => {
      const aValue = a[sortKey as keyof DivisionSummary]
      const bValue = b[sortKey as keyof DivisionSummary]
      const comparison = typeof aValue === 'number' && typeof bValue === 'number'
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue))
      return sortDirection === 'asc' ? comparison : -comparison
    })
    return result
  }, [query, rows, sortDirection, sortKey])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const totals = {
    officeCount: rows.reduce((sum, row) => sum + row.officeCount, 0),
    rictAccountOpen: rows.reduce((sum, row) => sum + row.rictAccountOpen, 0),
    savingsBankTransaction: rows.reduce((sum, row) => sum + row.savingsBankTransaction, 0),
    totalDepositAmount: rows.reduce((sum, row) => sum + row.totalDepositAmount, 0),
    activityRate: rows.length ? (officeRows.filter((row) => row.totalTransaction > 0).length / officeRows.length) * 100 : 0,
  }

  function toggleSort(key: string) {
    setSortKey(key)
    setSortDirection(sortKey === key && sortDirection === 'desc' ? 'asc' : 'desc')
  }

  return (
    <section id={id} className="panel table-panel">
      <div className="table-toolbar">
        <div className="section-heading">
          <h2>{title}</h2>
          <p>Search, sort, paginate and export the current report view</p>
        </div>
        <button className="secondary-button" type="button" onClick={onExport}>
          <Download size={16} />
          Export CSV
        </button>
      </div>
      <div className="table-controls">
        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder={`Search ${nameLabel}...`} />
        </label>
        <label>
          Rows per page
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}>
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Sr. No.</th>
              {columns.map((column) => (
                <th key={String(column.key)} className={column.align ? `align-${column.align}` : undefined}>
                  {column.sortable ? (
                    <button type="button" onClick={() => toggleSort(String(column.key))}>
                      {column.label}
                      <ArrowDownUp size={14} />
                    </button>
                  ) : column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length ? pageRows.map((row, index) => (
              <tr key={row.name}>
                <td>{(page - 1) * pageSize + index + 1}</td>
                {columns.map((column) => (
                  <td key={String(column.key)} className={column.align ? `align-${column.align}` : undefined}>
                    {column.render ? column.render(row) : String(row[column.key as keyof DivisionSummary])}
                  </td>
                ))}
              </tr>
            )) : (
              <tr><td colSpan={columns.length + 1} className="empty-cell">No data available for the selected date range.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <th>Total</th>
              <th>{formatNumber(rows.length)}</th>
              <th className="align-right">{formatNumber(totals.officeCount)}</th>
              <th className="align-right">{formatNumber(totals.rictAccountOpen)}</th>
              <th className="align-right">{formatNumber(totals.savingsBankTransaction)}</th>
              <th className="align-right">{formatCurrency(totals.totalDepositAmount)}</th>
              <th className="align-right">{formatPercentage(totals.activityRate)}</th>
              <th />
              {showAction ? <th /> : null}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="pagination">
        <span>Showing {pageRows.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filtered.length)} of {filtered.length}</span>
        <div>
          <button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <span>{page} / {totalPages}</span>
          <button type="button" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      </div>
    </section>
  )
}
