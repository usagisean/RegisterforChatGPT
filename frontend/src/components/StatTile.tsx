import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger'
}

export function StatTile({ label, value, icon, tone = 'default' }: StatTileProps) {
  return (
    <div className={`stat-tile stat-tile--${tone}`}>
      <div className="stat-tile__meta">
        <span className="stat-tile__label">{label}</span>
        <span className="stat-tile__value">{value}</span>
      </div>
      {icon ? <div className="stat-tile__icon">{icon}</div> : null}
    </div>
  )
}
