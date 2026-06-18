type StatCardProps = {
  label: string
  value: string | number
  highlight?: boolean
}

export function StatCard({ label, value, highlight }: StatCardProps) {
  return (
    <div className={`stat-card ${highlight ? 'stat-card--highlight' : ''}`}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
    </div>
  )
}
