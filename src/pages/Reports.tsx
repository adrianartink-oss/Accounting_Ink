import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Loader2, Printer, Sparkles } from 'lucide-react'
import { useCategories, useSettings, useTransactions } from '../store/hooks'
import {
  availableYears,
  filterTransactions,
  groupByCategory,
  summarize,
  type CategoryLine,
  type TxFilter,
} from '../lib/euer'
import { vatSummary } from '../lib/vat'
import { MissingApiKeyError, summarizePeriod } from '../lib/anthropic'
import { formatCents, formatSignedCents } from '../lib/money'
import { countryLabel } from '../lib/countries'
import { useCategoryName } from '../i18n/useCategoryName'
import { downloadBlob, transactionsToCsv } from '../lib/export'
import PageHeader from '../components/PageHeader'
import FilterBar from '../components/FilterBar'

export default function Reports() {
  const { t } = useTranslation()
  const txs = useTransactions()
  const categories = useCategories()
  const settings = useSettings()
  const years = useMemo(() => availableYears(txs), [txs])
  const [filter, setFilter] = useState<TxFilter>({
    country: 'ALL',
    sphere: 'business',
    year: new Date().getFullYear(),
  })

  const filtered = useMemo(() => filterTransactions(txs, filter), [txs, filter])
  const summary = useMemo(() => summarize(filtered), [filtered])
  const incomeLines = useMemo(
    () => groupByCategory(filtered, categories, 'income'),
    [filtered, categories],
  )
  const expenseLines = useMemo(
    () => groupByCategory(filtered, categories, 'expense'),
    [filtered, categories],
  )
  const vat = useMemo(() => vatSummary(filtered), [filtered])

  const periodLabel = [
    filter.year === 'ALL' ? t('reports.allYears') : String(filter.year),
    !filter.country || filter.country === 'ALL' ? t('reports.allCountries') : countryLabel(filter.country),
    filter.sphere === 'business'
      ? t('reports.business')
      : filter.sphere === 'private'
        ? t('reports.private')
        : t('reports.allSpheresShort'),
  ].join(' · ')

  const [aiText, setAiText] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  async function handleAiSummary() {
    setAiError(null)
    setAiText(null)
    setAiBusy(true)
    try {
      const report = buildReportText(incomeLines, expenseLines, summary.surplusCents)
      const text = await summarizePeriod(report, periodLabel, settings)
      setAiText(text)
    } catch (err) {
      setAiError(
        err instanceof MissingApiKeyError
          ? err.message
          : t('scan.analysisFailed', { error: err instanceof Error ? err.message : String(err) }),
      )
    } finally {
      setAiBusy(false)
    }
  }

  function handleCsv() {
    const csv = transactionsToCsv(filtered, categories)
    const scope = [
      filter.year === 'ALL' ? 'alle' : filter.year,
      filter.country === 'ALL' ? 'EU' : filter.country,
    ].join('_')
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `euer_${scope}.csv`)
  }

  return (
    <div>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        action={
          <div className="flex gap-2">
            <button className="btn" onClick={() => window.print()} title={t('reports.printTitle')}>
              <Printer size={18} />
            </button>
            <button className="btn btn-primary" onClick={handleCsv} disabled={filtered.length === 0}>
              <Download size={18} /> CSV
            </button>
          </div>
        }
      />

      <div className="no-print">
        <FilterBar filter={filter} onChange={(p) => setFilter((f) => ({ ...f, ...p }))} years={years} />
      </div>

      <div className="print-area">
        {/* Kopf für Druck/PDF */}
        <div className="card mb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
                {t('reports.euerTitle')}
              </div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                {settings.businessName || t('reports.defaultBusinessName')} ·{' '}
                {filter.year === 'ALL' ? t('reports.allYears') : filter.year} ·{' '}
                {!filter.country || filter.country === 'ALL'
                  ? t('reports.allCountries')
                  : countryLabel(filter.country)}{' '}
                ·{' '}
                {filter.sphere === 'business'
                  ? t('reports.business')
                  : filter.sphere === 'private'
                    ? t('reports.private')
                    : t('reports.allSpheres')}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <SumBox label={t('reports.income')} value={formatCents(summary.incomeCents)} color="var(--income)" />
            <SumBox label={t('reports.expenses')} value={formatCents(summary.expenseCents)} color="var(--expense)" />
            <SumBox
              label={t('reports.surplus')}
              value={formatSignedCents(summary.surplusCents)}
              color={summary.surplusCents >= 0 ? 'var(--income)' : 'var(--expense)'}
            />
          </div>
        </div>

        <ReportTable title={t('reports.income')} lines={incomeLines} total={summary.incomeCents} />
        <ReportTable title={t('reports.expenses')} lines={expenseLines} total={summary.expenseCents} />

        {!settings.kleinunternehmer && summary.count > 0 && (
          <div className="card mb-4">
            <h2 className="mb-3 font-semibold" style={{ color: 'var(--fg)' }}>
              {t('reports.ustTitle')}
            </h2>
            <VatLine label={t('reports.ustOutput')} value={vat.outputVatCents} />
            <VatLine label={t('reports.ustInput')} value={vat.inputVatCents} />
            <div className="flex items-center justify-between pt-3 font-semibold">
              <span style={{ color: 'var(--fg)' }}>{t('reports.payable')}</span>
              <span
                className="tabular-nums"
                style={{ color: vat.payableCents >= 0 ? 'var(--fg)' : 'var(--income)' }}
              >
                {formatSignedCents(vat.payableCents)}
              </span>
            </div>
            <div className="mt-2 flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
              <span>{t('reports.netIncome', { value: formatCents(vat.netIncomeCents) })}</span>
              <span>{t('reports.netExpense', { value: formatCents(vat.netExpenseCents) })}</span>
            </div>
          </div>
        )}

        {settings.kleinunternehmer && (
          <p className="mt-4 text-xs" style={{ color: 'var(--muted)' }}>
            {t('reports.kuNote')}
          </p>
        )}
      </div>

      {/* KI-Zusammenfassung */}
      <div className="no-print card mt-1">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold" style={{ color: 'var(--fg)' }}>
            <Sparkles size={18} color="var(--accent)" /> {t('reports.aiTitle')}
          </h2>
          <button
            className="btn btn-primary"
            onClick={handleAiSummary}
            disabled={aiBusy || summary.count === 0}
          >
            {aiBusy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {t('reports.analyze')}
          </button>
        </div>
        {aiError && (
          <p className="text-sm" style={{ color: 'var(--expense)' }}>
            {aiError}
          </p>
        )}
        {aiText && (
          <div
            className="mt-1 space-y-1 whitespace-pre-wrap text-sm leading-relaxed"
            style={{ color: 'var(--fg)' }}
          >
            {aiText}
          </div>
        )}
        {!aiText && !aiError && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {t('reports.aiPlaceholder')}
          </p>
        )}
      </div>
    </div>
  )
}

function VatLine({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="flex items-center justify-between border-b py-2 text-sm last:border-0"
      style={{ borderColor: 'var(--border)' }}
    >
      <span style={{ color: 'var(--fg)' }}>{label}</span>
      <span className="tabular-nums font-medium" style={{ color: 'var(--fg)' }}>
        {formatCents(value)}
      </span>
    </div>
  )
}

/** Baut eine kompakte Textdarstellung für die KI-Zusammenfassung. */
function buildReportText(
  income: CategoryLine[],
  expense: CategoryLine[],
  surplusCents: number,
): string {
  const fmt = (lines: CategoryLine[]) =>
    lines.map((l) => `  - ${l.categoryName}: ${formatCents(l.amountCents)} (${l.count})`).join('\n') ||
    '  - keine'
  return (
    `Einnahmen:\n${fmt(income)}\n\n` +
    `Ausgaben:\n${fmt(expense)}\n\n` +
    `Überschuss: ${formatSignedCents(surplusCents)}`
  )
}

function SumBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
      <div className="text-lg font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

function ReportTable({
  title,
  lines,
  total,
}: {
  title: string
  lines: ReturnType<typeof groupByCategory>
  total: number
}) {
  const { t } = useTranslation()
  const categoryName = useCategoryName()
  return (
    <div className="card mb-4">
      <h2 className="mb-3 font-semibold" style={{ color: 'var(--fg)' }}>
        {title}
      </h2>
      {lines.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {t('reports.noBookings')}
        </p>
      ) : (
        <div>
          {lines.map((line) => (
            <div
              key={line.categoryId}
              className="flex items-center justify-between border-b py-2 text-sm last:border-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: line.color }}
                />
                {categoryName({ id: line.categoryId, name: line.categoryName })}
                {line.skr03Code && (
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    · {line.skr03Code}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  ({line.count})
                </span>
              </span>
              <span className="tabular-nums font-medium" style={{ color: 'var(--fg)' }}>
                {formatCents(line.amountCents)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 font-semibold">
            <span style={{ color: 'var(--fg)' }}>{t('reports.sumOf', { title })}</span>
            <span className="tabular-nums" style={{ color: 'var(--fg)' }}>
              {formatCents(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
