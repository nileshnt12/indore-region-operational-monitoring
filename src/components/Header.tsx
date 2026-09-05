import { RefreshCw, UserCircle } from 'lucide-react'

interface Props {
  lastUpdated: string
  loading: boolean
  onRefresh: () => void
}

export function Header({ lastUpdated, loading, onRefresh }: Props) {
  return (
    <header className="app-header">
      <div className="header-title">
        <div>
          <div className="brand-line">EVERY USER</div>
          <h1>Indore Region Operational Monitoring</h1>
          <p>Department of Posts · Madhya Pradesh Circle</p>
        </div>
      </div>
      <div className="header-actions">
        <span className="last-updated">Last Updated: {lastUpdated}</span>
        <button className="icon-button" type="button" onClick={onRefresh} aria-label="Refresh dashboard">
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
        <UserCircle className="profile-icon" size={30} aria-label="User profile" />
      </div>
    </header>
  )
}
