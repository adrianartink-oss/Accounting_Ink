import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import type { Category, Transaction } from '../db/types'
import { formatCents, formatDate } from '../lib/money'
import { countryShortLabel } from '../lib/countries'
import { useCategoryName } from '../i18n/useCategoryName'
import CategoryIcon from './CategoryIcon'

/** Eine Zeile in der Buchungsliste. Tippen öffnet die Bearbeitung. */
export default function TransactionRow({
  tx,
  category,
}: {
  tx: Transaction
  category?: Category
}) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const categoryName = useCategoryName()
  const isIncome = tx.type === 'income'
  const color = category?.color ?? 'var(--muted)'

  return (
    <button
      onClick={() => navigate(`/add/${tx.id}`)}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition active:scale-[0.99]"
      style={{ background: 'var(--surface)' }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }}
      >
        <CategoryIcon name={category?.icon ?? 'Tag'} size={20} color={color} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium" style={{ color: 'var(--fg)' }}>
            {tx.counterparty || category?.name || 'Buchung'}
          </span>
          {tx.source === 'ai' && <Sparkles size={13} color="var(--accent)" />}
        </div>
        <div className="truncate text-sm" style={{ color: 'var(--muted)' }}>
          {category ? categoryName(category) : '—'} · {countryShortLabel(tx.country)} ·{' '}
          {t(tx.sphere === 'business' ? 'form.business' : 'form.private')}
        </div>
      </div>

      <div className="text-right">
        <div
          className="font-semibold tabular-nums"
          style={{ color: isIncome ? 'var(--income)' : 'var(--fg)' }}
        >
          {isIncome ? '+' : '−'}
          {formatCents(tx.amountCents, tx.currency)}
        </div>
        <div className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
          {formatDate(tx.date)}
        </div>
      </div>
    </button>
  )
}
