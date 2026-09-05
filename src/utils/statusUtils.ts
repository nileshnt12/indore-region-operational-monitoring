import type { StatusLabel } from '../types/dashboard'

export function getStatus(activityRate: number): StatusLabel {
  if (activityRate >= 75) return 'Excellent'
  if (activityRate >= 55) return 'Good'
  if (activityRate >= 30) return 'Needs Attention'
  return 'Critical'
}

export function statusClass(status: StatusLabel): string {
  return {
    Excellent: 'status-excellent',
    Good: 'status-good',
    'Needs Attention': 'status-attention',
    Critical: 'status-critical',
  }[status]
}
