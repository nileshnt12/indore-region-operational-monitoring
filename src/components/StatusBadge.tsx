import type { StatusLabel } from '../types/dashboard'
import { statusClass } from '../utils/statusUtils'

interface Props {
  status: StatusLabel
}

export function StatusBadge({ status }: Props) {
  return <span className={`status-badge ${statusClass(status)}`}>{status}</span>
}
