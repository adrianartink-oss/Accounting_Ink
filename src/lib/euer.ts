import type { Category, Country, Sphere, Transaction } from '../db/types'

/** Filterkriterien für Auswertungen. */
export interface TxFilter {
  country?: Country | 'ALL'
  sphere?: Sphere | 'ALL'
  /** Jahr (z. B. 2026). */
  year?: number | 'ALL'
  /** Monat 1–12, optional. */
  month?: number
}

/** Kernkennzahlen eines Zeitraums (Einnahmen-Überschuss-Rechnung). */
export interface Summary {
  incomeCents: number
  expenseCents: number
  /** Überschuss = Einnahmen − Ausgaben (kann negativ sein). */
  surplusCents: number
  count: number
}

/** Prüft, ob eine Buchung dem Filter entspricht. */
export function matchesFilter(tx: Transaction, filter: TxFilter): boolean {
  if (filter.country && filter.country !== 'ALL' && tx.country !== filter.country) {
    return false
  }
  if (filter.sphere && filter.sphere !== 'ALL' && tx.sphere !== filter.sphere) {
    return false
  }
  if (filter.year && filter.year !== 'ALL') {
    const y = Number.parseInt(tx.date.slice(0, 4), 10)
    if (y !== filter.year) return false
  }
  if (filter.month) {
    const m = Number.parseInt(tx.date.slice(5, 7), 10)
    if (m !== filter.month) return false
  }
  return true
}

/** Wendet einen Filter auf eine Buchungsliste an. */
export function filterTransactions(txs: Transaction[], filter: TxFilter): Transaction[] {
  return txs.filter((tx) => matchesFilter(tx, filter))
}

/** Aggregiert Einnahmen, Ausgaben und Überschuss. */
export function summarize(txs: Transaction[]): Summary {
  let incomeCents = 0
  let expenseCents = 0
  for (const tx of txs) {
    if (tx.type === 'income') incomeCents += tx.amountCents
    else expenseCents += tx.amountCents
  }
  return {
    incomeCents,
    expenseCents,
    surplusCents: incomeCents - expenseCents,
    count: txs.length,
  }
}

/** Zeile einer EÜR-Aufstellung je Kategorie. */
export interface CategoryLine {
  categoryId: string
  categoryName: string
  skr03Code?: string
  color: string
  amountCents: number
  count: number
}

/** Summiert Buchungen einer Art (income/expense) je Kategorie, absteigend. */
export function groupByCategory(
  txs: Transaction[],
  categories: Category[],
  kind: 'income' | 'expense',
): CategoryLine[] {
  const byId = new Map<string, Category>(categories.map((c) => [c.id, c]))
  const totals = new Map<string, { amount: number; count: number }>()

  for (const tx of txs) {
    if (tx.type !== kind) continue
    const entry = totals.get(tx.categoryId) ?? { amount: 0, count: 0 }
    entry.amount += tx.amountCents
    entry.count += 1
    totals.set(tx.categoryId, entry)
  }

  const lines: CategoryLine[] = []
  for (const [categoryId, { amount, count }] of totals) {
    const cat = byId.get(categoryId)
    lines.push({
      categoryId,
      categoryName: cat?.name ?? 'Unbekannt',
      skr03Code: cat?.skr03Code,
      color: cat?.color ?? '#64748b',
      amountCents: amount,
      count,
    })
  }
  lines.sort((a, b) => b.amountCents - a.amountCents)
  return lines
}

/** Monatspunkt für Verlaufsdiagramme. */
export interface MonthPoint {
  /** 1–12 */
  month: number
  label: string
  incomeCents: number
  expenseCents: number
  surplusCents: number
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
]

/** Baut eine 12-Monats-Reihe (Einnahmen/Ausgaben/Überschuss) für ein Jahr. */
export function groupByMonth(txs: Transaction[], year: number): MonthPoint[] {
  const points: MonthPoint[] = MONTH_LABELS.map((label, i) => ({
    month: i + 1,
    label,
    incomeCents: 0,
    expenseCents: 0,
    surplusCents: 0,
  }))
  for (const tx of txs) {
    const y = Number.parseInt(tx.date.slice(0, 4), 10)
    if (y !== year) continue
    const m = Number.parseInt(tx.date.slice(5, 7), 10)
    const point = points[m - 1]
    if (!point) continue
    if (tx.type === 'income') point.incomeCents += tx.amountCents
    else point.expenseCents += tx.amountCents
  }
  for (const p of points) p.surplusCents = p.incomeCents - p.expenseCents
  return points
}

/** Alle in den Buchungen vorkommenden Jahre, absteigend. */
export function availableYears(txs: Transaction[]): number[] {
  const years = new Set<number>()
  for (const tx of txs) years.add(Number.parseInt(tx.date.slice(0, 4), 10))
  const current = new Date().getFullYear()
  years.add(current)
  return [...years].sort((a, b) => b - a)
}
