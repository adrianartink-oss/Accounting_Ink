import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Repeat, Trash2, X } from 'lucide-react'
import { useCategories, useRecurring, useSettings } from '../store/hooks'
import { addRecurring, deleteRecurring, generateDueRecurring, updateRecurring } from '../db/repo'
import { INTERVAL_LABEL, todayIso } from '../lib/recurring'
import { defaultVatBps } from '../lib/vat'
import { formatCents, parseAmountToCents } from '../lib/money'
import { EU_COUNTRIES, countryShortLabel, currencyForCountry } from '../lib/countries'
import type { Country, RecurringInterval, Sphere, TxType } from '../db/types'
import PageHeader from '../components/PageHeader'
import CategoryIcon from '../components/CategoryIcon'

export default function Recurring() {
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
        <ArrowLeft size={16} /> Zurück
      </button>

      <PageHeader
        title="Wiederkehrende Buchungen"
        subtitle="Miete, Versicherung & Co. automatisch anlegen"
        action={
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            <Plus size={18} /> Neu
          </button>
        }
      />

      {adding && <AddRuleForm onClose={() => setAdding(false)} />}

      {rules.length === 0 ? (
        <div className="card text-center" style={{ color: 'var(--muted)' }}>
          Noch keine wiederkehrenden Buchungen.
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
                    {r.counterparty || cat?.name || 'Buchung'}
                  </div>
                  <div className="truncate text-sm" style={{ color: 'var(--muted)' }}>
                    {INTERVAL_LABEL[r.interval]} · nächste: {formatDate(r.nextDate)} ·{' '}
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
                  title={r.active ? 'Pausieren' : 'Aktivieren'}
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
      setError('Bitte einen gültigen Betrag eingeben.')
      return
    }
    if (!effectiveCategoryId) {
      setError('Bitte eine Kategorie wählen.')
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
          Neue wiederkehrende Buchung
        </h2>
        <button onClick={onClose} className="p-1">
          <X size={18} color="var(--muted)" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <select className="input" value={type} onChange={(e) => setType(e.target.value as TxType)}>
            <option value="expense">Ausgabe</option>
            <option value="income">Einnahme</option>
          </select>
          <select
            className="input"
            value={interval}
            onChange={(e) => setInterval(e.target.value as RecurringInterval)}
          >
            {(Object.keys(INTERVAL_LABEL) as RecurringInterval[]).map((k) => (
              <option key={k} value={k}>
                {INTERVAL_LABEL[k]}
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
            <option value="business">Gewerblich</option>
            <option value="private">Privat</option>
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
              {c.name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-3">
          <input
            className="input"
            inputMode="decimal"
            placeholder="Betrag €"
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
          placeholder="Bezeichnung (z. B. Studio-Miete)"
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
        />
        <input
          className="input"
          placeholder="Beschreibung (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && (
          <p className="text-sm" style={{ color: 'var(--expense)' }}>
            {error}
          </p>
        )}

        <button className="btn btn-primary w-full" onClick={submit}>
          Regel anlegen
        </button>
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
