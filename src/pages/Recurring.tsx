import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Plus, Repeat, Trash2, X } from 'lucide-react'
import { useCategories, useRecurring, useSettings } from '../store/hooks'
import { addRecurring, deleteRecurring, generateDueRecurring, updateRecurring } from '../db/repo'
import { todayIso } from '../lib/recurring'
import { defaultVatBps } from '../lib/vat'
import { formatCents, formatDate, parseAmountToCents } from '../lib/money'
import { EU_COUNTRIES, countryShortLabel, currencyForCountry } from '../lib/countries'
import { useCategoryName } from '../i18n/useCategoryName'
import type { Country, RecurringInterval, Sphere, TxType } from '../db/types'
import PageHeader from '../components/PageHeader'
import CategoryIcon from '../components/CategoryIcon'

/** i18n-Keys für die Intervall-Labels. */
const INTERVAL_KEY: Record<RecurringInterval, string> = {
  weekly: 'recurring.intervalWeekly',
  monthly: 'recurring.intervalMonthly',
  quarterly: 'recurring.intervalQuarterly',
  yearly: 'recurring.intervalYearly',
}

export default function Recurring() {
  const { t } = useTranslation()
  const categoryName = useCategoryName()
  const rules = useRecurring()
  const categories = useCategories()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-2 flex items-center gap-1 text-sm font-medium"
        style={{ color: 'var(--muted)' }}
      >
        <ArrowLeft size={16} /> {t('common.back')}
      </button>

      <PageHeader
        title={t('recurring.title')}
        subtitle={t('recurring.subtitle')}
        action={
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            <Plus size={18} /> {t('common.new')}
          </button>
        }
      />

      {adding && <AddRuleForm onClose={() => setAdding(false)} />}

      {rules.length === 0 ? (
        <div className="card text-center" style={{ color: 'var(--muted)' }}>
          {t('recurring.empty')}
        </div>
      ) : (
        <div className="card !p-2">
          {rules.map((r) => {
            const cat = catById.get(r.categoryId)
            const color = cat?.color ?? 'var(--muted)'
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }}
                >
                  <CategoryIcon name={cat?.icon ?? 'Repeat'} size={20} color={color} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium" style={{ color: 'var(--fg)' }}>
                    {r.counterparty || (cat ? categoryName(cat) : t('recurring.bookingFallback'))}
                  </div>
                  <div className="truncate text-sm" style={{ color: 'var(--muted)' }}>
                    {t(INTERVAL_KEY[r.interval])} · {t('recurring.nextLabel')} {formatDate(r.nextDate)} ·{' '}
                    {countryShortLabel(r.country)}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="font-semibold tabular-nums"
                    style={{ color: r.type === 'income' ? 'var(--income)' : 'var(--fg)' }}
                  >
                    {r.type === 'income' ? '+' : '−'}
                    {formatCents(r.amountCents, r.currency)}
                  </div>
                </div>
                <button
                  className="rounded-lg p-2"
                  onClick={() => updateRecurring(r.id, { active: !r.active })}
                  title={r.active ? t('recurring.pause') : t('recurring.activate')}
                >
                  <span
                    className="relative block h-6 w-10 rounded-full transition"
                    style={{ background: r.active ? 'var(--accent)' : 'var(--surface-2)' }}
                  >
                    <span
                      className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
                      style={{ left: r.active ? 20 : 4 }}
                    />
                  </span>
                </button>
                <button
                  className="rounded-lg p-2"
                  onClick={() => {
                    if (confirm('Diese Regel löschen? Bereits erzeugte Buchungen bleiben erhalten.'))
                      deleteRecurring(r.id)
                  }}
                >
                  <Trash2 size={16} color="var(--expense)" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-4 flex items-start gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
        <Repeat size={13} className="mt-0.5 shrink-0" />
        Fällige Buchungen werden beim App-Start automatisch erzeugt.
      </p>
    </div>
  )
}

function AddRuleForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const categoryName = useCategoryName()
  const categories = useCategories()
  const settings = useSettings()
  const [type, setType] = useState<TxType>('expense')
  const [sphere, setSphere] = useState<Sphere>('business')
  const [country, setCountry] = useState<Country>(settings.defaultCountry)
  const [interval, setInterval] = useState<RecurringInterval>('monthly')
  const [amount, setAmount] = useState('')
  const [startDate, setStartDate] = useState(todayIso())
  const [counterparty, setCounterparty] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const options = useMemo(
    () => categories.filter((c) => c.kind === type && c.sphere === sphere),
    [categories, type, sphere],
  )
  const [categoryId, setCategoryId] = useState(options[0]?.id ?? '')
  const effectiveCategoryId = options.some((c) => c.id === categoryId)
    ? categoryId
    : (options[0]?.id ?? '')

  async function submit() {
    setError(null)
    const cents = parseAmountToCents(amount)
    if (cents == null || cents <= 0) {
      setError(t('recurring.errorAmount'))
      return
    }
    if (!effectiveCategoryId) {
      setError(t('recurring.errorCategory'))
      return
    }
    await addRecurring({
      active: true,
      interval,
      type,
      sphere,
      country,
      categoryId: effectiveCategoryId,
      amountCents: cents,
      currency: currencyForCountry(country),
      vatRateBps: settings.kleinunternehmer ? null : defaultVatBps(country),
      counterparty: counterparty.trim(),
      description: description.trim(),
      startDate,
    })
    // Sofort fällige Termine erzeugen.
    await generateDueRecurring()
    onClose()
  }

  return (
    <div className="card mb-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>
          {t('recurring.newTitle')}
        </h2>
        <button onClick={onClose} className="p-1">
          <X size={18} color="var(--muted)" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <select className="input" value={type} onChange={(e) => setType(e.target.value as TxType)}>
            <option value="expense">{t('recurring.expense')}</option>
            <option value="income">{t('recurring.income')}</option>
          </select>
          <select
            className="input"
            value={interval}
            onChange={(e) => setInterval(e.target.value as RecurringInterval)}
          >
            {(Object.keys(INTERVAL_KEY) as RecurringInterval[]).map((k) => (
              <option key={k} value={k}>
                {t(INTERVAL_KEY[k])}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <select
            className="input"
            value={sphere}
            onChange={(e) => setSphere(e.target.value as Sphere)}
          >
            <option value="business">{t('recurring.business')}</option>
            <option value="private">{t('recurring.private')}</option>
          </select>
          <select
            className="input"
            value={country}
            onChange={(e) => setCountry(e.target.value as Country)}
          >
            {EU_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>

        <select
          className="input"
          value={effectiveCategoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {categoryName(c)}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-3">
          <input
            className="input"
            inputMode="decimal"
            placeholder={t('recurring.amountPlaceholder')}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <input
          className="input"
          placeholder={t('recurring.namePlaceholder')}
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
        />
        <input
          className="input"
          placeholder={t('recurring.descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && (
          <p className="text-sm" style={{ color: 'var(--expense)' }}>
            {error}
          </p>
        )}

        <button className="btn btn-primary w-full" onClick={submit}>
          {t('recurring.create')}
        </button>
      </div>
    </div>
  )
}
