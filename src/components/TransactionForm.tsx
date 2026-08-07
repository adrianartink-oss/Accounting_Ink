import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Category, Country, Currency, Settings, Sphere, TxType } from '../db/types'
import type { TransactionInput } from '../db/repo'
import { centsToInputString, currencySymbol, formatCents, parseAmountToCents } from '../lib/money'
import { VAT_RATES, defaultVatBps, splitGross } from '../lib/vat'
import { EU_COUNTRIES, currencyForCountry } from '../lib/countries'
import { useCategoryName } from '../i18n/useCategoryName'
import CategoryIcon from './CategoryIcon'

export interface TransactionFormValues {
  type: TxType
  sphere: Sphere
  country: Country
  categoryId: string
  amountCents: number
  date: string
  counterparty: string
  description: string
  vatRateBps?: number | null
  motif?: string
  bodyPart?: string
  sizeText?: string
  durationMin?: number
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Buchungsformular. Gibt beim Speichern einen vollständigen TransactionInput zurück. */
export default function TransactionForm({
  categories,
  settings,
  initial,
  receiptId,
  submitLabel = 'Speichern',
  onSave,
  onDelete,
}: {
  categories: Category[]
  settings: Settings
  initial?: Partial<TransactionFormValues>
  receiptId?: string
  submitLabel?: string
  onSave: (input: TransactionInput) => void | Promise<void>
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const categoryName = useCategoryName()
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  const [sphere, setSphere] = useState<Sphere>(initial?.sphere ?? 'business')
  const [country, setCountry] = useState<Country>(initial?.country ?? settings.defaultCountry)
  const [amount, setAmount] = useState(
    initial?.amountCents != null ? centsToInputString(initial.amountCents) : '',
  )
  const [date, setDate] = useState(initial?.date ?? today())
  const [counterparty, setCounterparty] = useState(initial?.counterparty ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  // Tattoo-Details (nur bei gewerblichen Einnahmen)
  const [motif, setMotif] = useState(initial?.motif ?? '')
  const [bodyPart, setBodyPart] = useState(initial?.bodyPart ?? '')
  const [sizeText, setSizeText] = useState(initial?.sizeText ?? '')
  const [durationHours, setDurationHours] = useState(
    initial?.durationMin ? centsToInputString(Math.round((initial.durationMin / 60) * 100)) : '',
  )
  const [vatRateBps, setVatRateBps] = useState<number>(
    initial?.vatRateBps ?? defaultVatBps(initial?.country ?? settings.defaultCountry),
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Länderabhängige USt-Sätze; bei Länderwechsel ggf. auf Standard zurücksetzen.
  const vatOptions = VAT_RATES[country]
  const effectiveVatBps = vatOptions.some((o) => o.bps === vatRateBps)
    ? vatRateBps
    : defaultVatBps(country)

  // Währung ergibt sich aus dem gewählten Land (EUR bzw. Landeswährung).
  const currency = currencyForCountry(country)

  const options = useMemo(
    () => categories.filter((c) => c.kind === type && c.sphere === sphere),
    [categories, type, sphere],
  )

  const [categoryId, setCategoryId] = useState<string>(
    initial?.categoryId && categories.some((c) => c.id === initial.categoryId)
      ? initial.categoryId
      : (options[0]?.id ?? ''),
  )

  // Kategorie zurücksetzen, wenn sie nicht mehr zur Auswahl passt.
  const currentValid = options.some((c) => c.id === categoryId)
  const effectiveCategoryId = currentValid ? categoryId : (options[0]?.id ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cents = parseAmountToCents(amount)
    if (cents == null || cents <= 0) {
      setError(t('form.errorAmount'))
      return
    }
    if (!effectiveCategoryId) {
      setError(t('form.errorCategory'))
      return
    }
    const isTattoo = type === 'income' && sphere === 'business'
    const hoursParsed = parseAmountToCents(durationHours)
    const durationMin =
      isTattoo && hoursParsed != null && hoursParsed > 0 ? Math.round(hoursParsed * 0.6) : undefined

    setSaving(true)
    try {
      await onSave({
        type,
        sphere,
        country,
        categoryId: effectiveCategoryId,
        amountCents: cents,
        currency,
        vatRateBps: settings.kleinunternehmer ? null : effectiveVatBps,
        date,
        counterparty: counterparty.trim(),
        description: description.trim(),
        receiptId,
        source: 'manual',
        motif: isTattoo && motif.trim() ? motif.trim() : undefined,
        bodyPart: isTattoo && bodyPart.trim() ? bodyPart.trim() : undefined,
        sizeText: isTattoo && sizeText.trim() ? sizeText.trim() : undefined,
        durationMin,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Einnahme / Ausgabe */}
      <Segmented
        value={type}
        onChange={(v) => setType(v)}
        options={[
          { value: 'expense', label: t('form.expense'), accent: 'var(--expense)' },
          { value: 'income', label: t('form.income'), accent: 'var(--income)' },
        ]}
      />

      {/* Betrag */}
      <div>
        <label className="label" htmlFor="amount">
          {t('form.amount', { symbol: currencySymbol(currency) })}
        </label>
        <input
          id="amount"
          className="input text-2xl font-semibold tabular-nums"
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {/* Umsatzsteuer (nur bei Regelbesteuerung) */}
      {!settings.kleinunternehmer && (
        <div>
          <span className="label">{t('form.vat', { country })}</span>
          <div className="flex flex-wrap gap-2">
            {vatOptions.map((o) => (
              <button
                key={o.bps}
                type="button"
                className="chip"
                data-active={o.bps === effectiveVatBps}
                onClick={() => setVatRateBps(o.bps)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <VatPreview
            grossCents={parseAmountToCents(amount) ?? 0}
            rateBps={effectiveVatBps}
            currency={currency}
          />
        </div>
      )}

      {/* Sphäre + Land */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="label">{t('form.sphere')}</span>
          <Segmented
            value={sphere}
            onChange={(v) => setSphere(v)}
            options={[
              { value: 'business', label: t('form.business') },
              { value: 'private', label: t('form.private') },
            ]}
          />
        </div>
        <div>
          <label className="label" htmlFor="country">
            {t('form.country')}
          </label>
          <select
            id="country"
            className="input"
            value={country}
            onChange={(e) => setCountry(e.target.value as Country)}
          >
            {EU_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name} ({c.currency})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kategorie */}
      <div>
        <span className="label">{t('form.category')}</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {options.map((c) => {
            const active = c.id === effectiveCategoryId
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition active:scale-[0.98]"
                style={{
                  borderColor: active ? c.color : 'var(--border)',
                  background: active
                    ? `color-mix(in srgb, ${c.color} 18%, transparent)`
                    : 'var(--bg-elev)',
                  color: 'var(--fg)',
                }}
              >
                <CategoryIcon name={c.icon} size={18} color={c.color} />
                <span className="truncate">{categoryName(c)}</span>
              </button>
            )
          })}
          {options.length === 0 && (
            <p className="col-span-full text-sm" style={{ color: 'var(--muted)' }}>
              {t('form.noCategoryCombo')}
            </p>
          )}
        </div>
      </div>

      {/* Datum */}
      <div>
        <label className="label" htmlFor="date">
          {t('form.date')}
        </label>
        <input
          id="date"
          type="date"
          className="input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Gegenpartei */}
      <div>
        <label className="label" htmlFor="counterparty">
          {t(type === 'income' ? 'form.customer' : 'form.merchant')}
        </label>
        <input
          id="counterparty"
          className="input"
          placeholder={t(type === 'income' ? 'form.customerPlaceholder' : 'form.merchantPlaceholder')}
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
        />
      </div>

      {/* Beschreibung */}
      <div>
        <label className="label" htmlFor="description">
          {t('form.description')}
        </label>
        <input
          id="description"
          className="input"
          placeholder={t('form.descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Tattoo-Details (nur bei gewerblichen Einnahmen) */}
      {type === 'income' && sphere === 'business' && (
        <div
          className="rounded-xl border p-3"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-elev)' }}
        >
          <span className="label !mb-2">{t('form.tattooDetails')}</span>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input"
              placeholder={t('form.motif')}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
            />
            <input
              className="input"
              placeholder={t('form.bodyPart')}
              value={bodyPart}
              onChange={(e) => setBodyPart(e.target.value)}
            />
            <input
              className="input"
              placeholder={t('form.size')}
              value={sizeText}
              onChange={(e) => setSizeText(e.target.value)}
            />
            <input
              className="input"
              inputMode="decimal"
              placeholder={t('form.duration')}
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: 'var(--expense)' }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        {onDelete && (
          <button
            type="button"
            className="btn"
            style={{ color: 'var(--expense)', borderColor: 'var(--expense)' }}
            onClick={onDelete}
          >
            <Trash2 size={18} /> {t('common.delete')}
          </button>
        )}
        <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
          {saving ? t('form.saving') : submitLabel}
        </button>
      </div>
    </form>
  )
}

function VatPreview({
  grossCents,
  rateBps,
  currency,
}: {
  grossCents: number
  rateBps: number
  currency: Currency
}) {
  const { t } = useTranslation()
  if (grossCents <= 0) return null
  const { netCents, vatCents } = splitGross(grossCents, rateBps)
  return (
    <div className="mt-2 flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
      <span>{t('form.netto', { value: formatCents(netCents, currency) })}</span>
      <span>{t('form.ustShort', { value: formatCents(vatCents, currency) })}</span>
      <span>{t('form.brutto', { value: formatCents(grossCents, currency) })}</span>
    </div>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; accent?: string }[]
}) {
  return (
    <div
      className="grid grid-flow-col gap-1 rounded-xl p-1"
      style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="rounded-lg px-3 py-2 text-sm font-medium transition active:scale-[0.98]"
            style={{
              background: active ? (o.accent ?? 'var(--accent)') : 'transparent',
              color: active ? 'var(--accent-fg)' : 'var(--muted)',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
