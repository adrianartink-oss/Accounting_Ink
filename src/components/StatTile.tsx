import type { ReactNode } from 'react'

/** Kennzahl-Kachel für das Dashboard. */
export default function StatTile({
  label,
  value,
  accent,
  icon,
  hint,
}: {
  label: string
  value: string
  accent?: string
  icon?: ReactNode
  hint?: string
}) {
  return (
    <div className="card !p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
          {label}
        </span>
        {icon}
      </div>
      <div
        className="text-2xl font-bold tabular-nums"
        style={{ color: accent ?? 'var(--fg)' }}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
          {hint}
        </div>
      )}
    </div>
  )
}
