import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DivisionSummary, TrendPoint } from '../types/dashboard'
import { formatCurrency, formatNumber } from '../utils/numberUtils'

interface Props {
  divisions: DivisionSummary[]
  trend: TrendPoint[]
}

export function PerformanceCharts({ divisions, trend }: Props) {
  return (
    <section className="chart-grid">
      <div className="panel chart-panel">
        <div className="section-heading">
          <h2>Division-wise Performance</h2>
          <p>Transactions and RICT activity by division</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={divisions} margin={{ left: 0, right: 10, top: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={70} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatNumber} width={70} />
            <Tooltip formatter={(value) => formatNumber(Number(value))} />
            <Legend />
            <Bar dataKey="totalTransaction" name="Transactions" fill="#b91c1c" radius={[4, 4, 0, 0]} />
            <Bar dataKey="rictDeposit" name="RICT Deposit" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="panel chart-panel">
        <div className="section-heading">
          <h2>Deposit and Withdrawal Trend</h2>
          <p>Current period with indicative prior movement</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trend} margin={{ left: 0, right: 16, top: 10, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(value) => formatNumber(Number(value) / 100000)} width={54} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Line type="monotone" dataKey="deposits" name="Deposit Amount" stroke="#15803d" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="withdrawals" name="Withdrawal Amount" stroke="#b45309" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
