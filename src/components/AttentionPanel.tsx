import type { DivisionSummary } from '../types/dashboard'
import { formatPercentage } from '../utils/numberUtils'
import { StatusBadge } from './StatusBadge'

interface Props {
  divisions: DivisionSummary[]
}

export function AttentionPanel({ divisions }: Props) {
  const top = [...divisions].sort((a, b) => b.activityRate - a.activityRate).slice(0, 5)
  const bottom = [...divisions].sort((a, b) => a.activityRate - b.activityRate).slice(0, 5)
  return (
    <section className="attention-grid">
      <UnitList title="Top Performing Units" rows={top} />
      <UnitList title="Units Requiring Attention" rows={bottom} />
    </section>
  )
}

function UnitList({ title, rows }: { title: string; rows: DivisionSummary[] }) {
  return (
    <div className="panel compact-list">
      <div className="section-heading"><h2>{title}</h2></div>
      {rows.map((row) => (
        <div className="unit-row" key={`${title}-${row.name}`}>
          <span>{row.name}</span>
          <strong>{formatPercentage(row.activityRate)}</strong>
          <StatusBadge status={row.status} />
        </div>
      ))}
    </div>
  )
}
