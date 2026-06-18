import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type LeadBarChartProps = {
  data: { month: string; leads: number; earnings: number }[]
}

export function LeadBarChart({ data }: LeadBarChartProps) {
  return (
    <div className="chart-card">
      <h3 className="chart-card__title">Lead &amp; Earning Summary</h3>
      <div className="chart-card__body">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barGap={4} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf4" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            />
            <Legend />
            <Bar dataKey="leads" name="Leads" fill="#4f6bf6" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="earnings" name="Earnings (₹)" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
