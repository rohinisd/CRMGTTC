import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#4f6bf6', '#22c55e', '#a855f7', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16']

type StatusPieChartProps = {
  data: { name: string; value: number }[]
}

export function StatusPieChart({ data }: StatusPieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="chart-card">
      <h3 className="chart-card__title">Status Breakdown</h3>
      <div className="chart-card__body chart-card__body--pie">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ percent }) => `${((percent ?? 0) * 100).toFixed(1)}%`}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const num = Number(value ?? 0)
                return [
                  `${num} (${total > 0 ? ((num / total) * 100).toFixed(1) : 0}%)`,
                  String(name),
                ]
              }}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span style={{ fontSize: 12, color: '#4b5563' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
