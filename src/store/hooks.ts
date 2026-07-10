import { useLiveQuery } from 'dexie-react-hooks'
import { db, defaultSettings } from '../db/schema'
import type { Category, Settings, Transaction } from '../db/types'

/** Reaktive Einstellungen (fällt auf Defaults zurück, bis geladen). */
export function useSettings(): Settings {
  const settings = useLiveQuery(() => db.settings.get('singleton'), [])
  return settings ?? defaultSettings
}

/** Reaktive Kategorienliste. */
export function useCategories(): Category[] {
  const cats = useLiveQuery(() => db.categories.toArray(), [])
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
