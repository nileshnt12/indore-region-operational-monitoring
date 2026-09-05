export function LoadingSkeleton() {
  return (
    <div className="skeleton-grid" aria-label="Loading dashboard data">
      {Array.from({ length: 6 }, (_, index) => <div className="skeleton-card" key={index} />)}
    </div>
  )
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="panel state-panel">
      <strong>Unable to load operational data. Please try again.</strong>
      <button className="primary-button" type="button" onClick={onRetry}>Retry</button>
    </div>
  )
}

export function EmptyState() {
  return (
    <div className="panel state-panel">
      <strong>No data available for the selected date range.</strong>
      <span>Please change the report period or selected unit.</span>
    </div>
  )
}
