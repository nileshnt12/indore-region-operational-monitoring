import type { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  value: string
  detail: string
  icon: LucideIcon
}

export function KpiCard({ title, value, detail, icon: Icon }: Props) {
  return (
    <article className="kpi-card">
      <div className="kpi-icon"><Icon size={19} /></div>
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  )
}
