import Dexie, { type EntityTable } from 'dexie'
import type { Category, Receipt, Settings, Transaction } from './types'
import { seedCategories } from './categories.seed'

/**
 * Lokale IndexedDB-Datenbank (local-first). Alle Nutzdaten bleiben auf dem
 * Gerät. Belege liegen als Blob in `receipts`, nicht im Service-Worker-Cache.
 */
class BuchhaltungDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>
  categories!: EntityTable<Category, 'id'>
  receipts!: EntityTable<Receipt, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor() {
    super('buchhaltung-priv')
    this.version(1).stores({
      // Indizes für schnelle Filter nach Datum, Land, Sphäre, Kategorie.
      transactions:
        'id, date, type, sphere, country, categoryId, [country+sphere], [date+country], createdAt',
      categories: 'id, kind, sphere',
      receipts: 'id, transactionId, createdAt',
      settings: 'id',
    })
  }
}

export const db = new BuchhaltungDB()

export const SETTINGS_ID = 'singleton' as const

export const defaultSettings: Settings = {
  id: SETTINGS_ID,
  kleinunternehmer: true,
  defaultCountry: 'DE',
  businessName: '',
  address: '',
  aiModel: 'claude-opus-4-8',
  disclaimerAccepted: false,
  theme: 'system',
}

/**
 * Legt beim ersten Start Standard-Kategorien und -Einstellungen an.
 * Idempotent: wird bei jedem App-Start aufgerufen, füllt aber nur Leerstände.
 */
export async function ensureSeeded(): Promise<void> {
  await db.transaction('rw', db.categories, db.settings, async () => {
    const catCount = await db.categories.count()
    if (catCount === 0) {
      await db.categories.bulkAdd(seedCategories)
    }
    const existing = await db.settings.get(SETTINGS_ID)
    if (!existing) {
      await db.settings.add(defaultSettings)
    }
  })
}

/** Aktuelle Einstellungen (mit Fallback auf die Defaults). */
export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(SETTINGS_ID)
  return s ?? defaultSettings
}

/** Einstellungen teilweise aktualisieren. */
export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, id: SETTINGS_ID })
}
