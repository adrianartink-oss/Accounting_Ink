import type { RecurringInterval, RecurringRule } from '../db/types'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Heutiges Datum als ISO YYYY-MM-DD (lokale Zeit). */
export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const total = m - 1 + n
  const ny = y + Math.floor(total / 12)
  const nm = (((total % 12) + 12) % 12) + 1
  // Tag 0 des Folgemonats = letzter Tag des Zielmonats.
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate()
  const nd = Math.min(d, lastDay)
  return `${ny}-${pad(nm)}-${pad(nd)}`
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

/** Schaltet ein Datum um ein Intervall weiter. */
export function advanceDate(iso: string, interval: RecurringInterval): string {
  switch (interval) {
    case 'weekly':
      return addDays(iso, 7)
    case 'monthly':
      return addMonths(iso, 1)
    case 'quarterly':
      return addMonths(iso, 3)
    case 'yearly':
      return addMonths(iso, 12)
  }
}

/** Menschenlesbares Label eines Intervalls. */
export const INTERVAL_LABEL: Record<RecurringInterval, string> = {
  weekly: 'Wöchentlich',
  monthly: 'Monatlich',
  quarterly: 'Vierteljährlich',
  yearly: 'Jährlich',
}

/**
 * Ermittelt alle fälligen Termine einer Regel bis einschließlich `today`
 * und den neuen `nextDate`. Begrenzt auf 500 Iterationen als Sicherung.
 */
export function dueDates(
  rule: Pick<RecurringRule, 'interval' | 'nextDate' | 'endDate'>,
  today: string,
): { dates: string[]; nextDate: string } {
  const dates: string[] = []
  let next = rule.nextDate
  let guard = 0
  while (next <= today && (!rule.endDate || next <= rule.endDate) && guard < 500) {
    dates.push(next)
    next = advanceDate(next, rule.interval)
    guard++
  }
  return { dates, nextDate: next }
}
