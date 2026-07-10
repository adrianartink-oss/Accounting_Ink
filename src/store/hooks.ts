import { useLiveQuery } from 'dexie-react-hooks'
import { db, defaultSettings } from '../db/schema'
import type { Category, RecurringRule, Settings, Transaction } from '../db/types'

/** Reaktive Einstellungen (fällt auf Defaults zurück, bis geladen). */
export function useSettings(): Settings {
  const settings = useLiveQuery(() => db.settings.get('singleton'), [])
  return settings ?? defaultSettings
}

/** Reaktive Kategorienliste (kuratierte Reihenfolge, dann alphabetisch). */
export function useCategories(): Category[] {
  const cats = useLiveQuery(async () => {
    const arr = await db.categories.toArray()
    return arr.sort(
      (a, b) =>
        (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) || a.name.localeCompare(b.name),
    )
  }, [])
  return cats ?? []
}

/** Reaktive Buchungsliste (nach Datum absteigend). */
export function useTransactions(): Transaction[] {
  const txs = useLiveQuery(
    () => db.transactions.orderBy('date').reverse().toArray(),
    [],
  )
  return txs ?? []
}

/** Einzelne Buchung reaktiv. */
export function useTransaction(id: string | undefined): Transaction | undefined {
  return useLiveQuery(() => (id ? db.transactions.get(id) : undefined), [id])
}

/** Reaktive Liste der wiederkehrenden Regeln. */
export function useRecurring(): RecurringRule[] {
  const rules = useLiveQuery(() => db.recurring.orderBy('nextDate').toArray(), [])
  return rules ?? []
}
