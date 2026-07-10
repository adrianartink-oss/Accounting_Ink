import type { ReactNode } from 'react'

/** Einheitlicher Seitenkopf mit Titel, optionalem Untertitel und Aktion. */
export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
