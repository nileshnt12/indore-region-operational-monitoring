import type { OfficeRecord } from '../types/dashboard'
import { formatNumber } from '../utils/numberUtils'

interface Props {
  records: OfficeRecord[]
}

export function OfficeTable({ records }: Props) {
  const topRecords = [...records].sort((a, b) => b.totalTransaction - a.totalTransaction).slice(0, 12)
  return (
    <section className="panel table-panel">
      <div className="section-heading">
        <h2>Detailed Operational Report</h2>
        <p>Top offices by transaction volume in the current view</p>
      </div>
      <div className="table-scroll compact-table">
        <table>
          <thead>
            <tr>
              <th>Office</th>
              <th>SOL ID / BOCODE</th>
              <th className="align-right">Transactions</th>
              <th className="align-right">RICT Deposit</th>
              <th className="align-right">RICT Withdrawal</th>
              <th className="align-right">Savings Bank Transaction</th>
            </tr>
          </thead>
          <tbody>
            {topRecords.map((record) => (
              <tr key={`${record.division}-${record.officeName}-${record.solId}`}>
                <td>{record.officeName}</td>
                <td>{record.solId || '-'}</td>
                <td className="align-right">{formatNumber(record.totalTransaction)}</td>
                <td className="align-right">{formatNumber(record.rictDeposit)}</td>
                <td className="align-right">{formatNumber(record.rictWithdrawal)}</td>
                <td className="align-right">{formatNumber(record.savingsBankTransaction)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
