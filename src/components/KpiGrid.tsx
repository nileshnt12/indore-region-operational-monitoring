import { kpiConfig } from '../data/metrics'
import type { DashboardSummary } from '../types/dashboard'
import { KpiCard } from './KpiCard'

interface Props {
  summary: DashboardSummary
}

export function KpiGrid({ summary }: Props) {
  return (
    <section className="kpi-grid" aria-label="KPI summary">
      {kpiConfig.map((kpi) => (
        <KpiCard
          key={kpi.key}
          title={kpi.label}
          value={kpi.value(summary)}
          detail={typeof kpi.detail === 'function' ? kpi.detail(summary) : kpi.detail}
          icon={kpi.icon}
        />
      ))}
    </section>
  )
}
