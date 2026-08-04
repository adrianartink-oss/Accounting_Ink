/** Dezenter Old-School-Zierteiler (Linie mit Raute in der Mitte). */
export default function Divider({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      style={{ color: 'var(--muted)' }}
      aria-hidden
    >
      <span className="h-px flex-1" style={{ background: 'currentColor', opacity: 0.4 }} />
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 1 L17 9 L9 17 L1 9 Z" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
        <circle cx="9" cy="9" r="2" fill="var(--accent)" />
      </svg>
      <span className="h-px flex-1" style={{ background: 'currentColor', opacity: 0.4 }} />
    </div>
  )
}
