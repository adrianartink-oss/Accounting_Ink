import { db } from './schema'
import type { Category, Receipt, RecurringRule, Transaction } from './types'
import type { BackupData } from '../lib/export'
import { dueDates, todayIso } from '../lib/recurring'

function uid(): string {
  return crypto.randomUUID()
}

/** Eingabedaten für eine neue Buchung (ohne generierte Felder). */
export type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>

/** Legt eine neue Buchung an und gibt ihre ID zurück. */
export async function addTransaction(input: TransactionInput): Promise<string> {
  const now = Date.now()
  const tx: Transaction = { ...input, id: uid(), createdAt: now, updatedAt: now }
  await db.transactions.add(tx)
  if (tx.receiptId) {
    await db.receipts.update(tx.receiptId, { transactionId: tx.id })
  }
  return tx.id
}

/** Aktualisiert eine bestehende Buchung. */
export async function updateTransaction(
  id: string,
  patch: Partial<TransactionInput>,
): Promise<void> {
  await db.transactions.update(id, { ...patch, updatedAt: Date.now() })
}

/** Löscht eine Buchung samt zugehörigem Beleg. */
export async function deleteTransaction(id: string): Promise<void> {
  const tx = await db.transactions.get(id)
  await db.transactions.delete(id)
  if (tx?.receiptId) {
    await db.receipts.delete(tx.receiptId)
  }
}

/** Speichert einen Beleg (Bild + Vorschau) und gibt die ID zurück. */
export async function addReceipt(blob: Blob, thumbnail: string): Promise<string> {
  const receipt: Receipt = {
    id: uid(),
    blob,
    thumbnail,
    createdAt: Date.now(),
  }
  await db.receipts.add(receipt)
  return receipt.id
}

/** Legt eine benutzerdefinierte Kategorie an (wird ans Ende einsortiert). */
export async function addCategory(
  input: Omit<Category, 'id' | 'custom' | 'sortOrder'>,
): Promise<string> {
  // Große sortOrder → benutzerdefinierte Kategorien erscheinen nach den Seeds.
  const cat: Category = { ...input, id: uid(), custom: true, sortOrder: 1000 + Date.now() % 100000 }
  await db.categories.add(cat)
  return cat.id
}

/** Löscht eine (benutzerdefinierte) Kategorie. */
export async function deleteCategory(id: string): Promise<void> {
  await db.categories.delete(id)
}

// ── Wiederkehrende Buchungen ─────────────────────────────────────────────

export type RecurringInput = Omit<RecurringRule, 'id' | 'createdAt' | 'nextDate'> & {
  nextDate?: string
}

/** Legt eine wiederkehrende Regel an. */
export async function addRecurring(input: RecurringInput): Promise<string> {
  const rule: RecurringRule = {
    ...input,
    id: uid(),
    nextDate: input.nextDate ?? input.startDate,
    createdAt: Date.now(),
  }
  await db.recurring.add(rule)
  return rule.id
}

/** Aktualisiert eine wiederkehrende Regel. */
export async function updateRecurring(
  id: string,
  patch: Partial<RecurringRule>,
): Promise<void> {
  await db.recurring.update(id, patch)
}

/** Löscht eine wiederkehrende Regel. */
export async function deleteRecurring(id: string): Promise<void> {
  await db.recurring.delete(id)
}

/**
 * Erzeugt alle fälligen wiederkehrenden Buchungen bis heute und schaltet die
 * jeweiligen Regeln weiter. Idempotent (wird beim App-Start aufgerufen).
 * Gibt die Anzahl neu erzeugter Buchungen zurück.
 */
export async function generateDueRecurring(): Promise<number> {
  const today = todayIso()
  const rules = await db.recurring.filter((r) => r.active).toArray()
  let created = 0

  for (const rule of rules) {
    const { dates, nextDate } = dueDates(rule, today)
    if (dates.length === 0) continue

    const now = Date.now()
    const txs: Transaction[] = dates.map((date) => ({
      id: uid(),
      date,
      type: rule.type,
      amountCents: rule.amountCents,
      currency: rule.currency,
      sphere: rule.sphere,
      country: rule.country,
      categoryId: rule.categoryId,
      vatRateBps: rule.vatRateBps,
      description: rule.description,
      counterparty: rule.counterparty,
      source: 'recurring',
      createdAt: now,
      updatedAt: now,
    }))

    await db.transaction('rw', db.transactions, db.recurring, async () => {
      await db.transactions.bulkAdd(txs)
      await db.recurring.update(rule.id, { nextDate })
    })
    created += txs.length
  }
  return created
}

/** Erstellt ein Backup-Objekt aus allen Buchungen und Kategorien. */
export async function buildBackup(): Promise<BackupData> {
  const [transactions, categories, recurring, settings] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.recurring.toArray(),
    db.settings.get('singleton'),
  ])
  // API-Key nicht mitsichern.
  const safeSettings = settings
    ? (() => {
        const { apiKeyEncrypted: _omit, ...rest } = settings
        void _omit
        return rest
      })()
    : undefined
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    categories,
    recurring,
    settings: safeSettings,
  }
}

/**
 * Importiert ein Backup. `mode: 'replace'` ersetzt alle Buchungen/Kategorien;
 * `mode: 'merge'` fügt hinzu (bestehende IDs werden überschrieben).
 * Belege sind nicht Teil des Backups.
 */
export async function importBackup(
  data: BackupData,
  mode: 'replace' | 'merge',
): Promise<{ transactions: number; categories: number }> {
  if (data.version !== 1 || !Array.isArray(data.transactions)) {
    throw new Error('Ungültiges Backup-Format.')
  }
  await db.transaction('rw', db.transactions, db.categories, db.recurring, async () => {
    if (mode === 'replace') {
      await db.transactions.clear()
      await db.categories.clear()
      await db.recurring.clear()
    }
    if (data.categories?.length) await db.categories.bulkPut(data.categories)
    if (data.transactions?.length) await db.transactions.bulkPut(data.transactions)
    if (data.recurring?.length) await db.recurring.bulkPut(data.recurring)
  })

  // Stammdaten/Kennzahlen wiederherstellen, aber den lokalen API-Key behalten.
  if (data.settings) {
    const current = await db.settings.get('singleton')
    await db.settings.put({
      ...data.settings,
      id: 'singleton',
      apiKeyEncrypted: current?.apiKeyEncrypted,
    })
  }
  return {
    transactions: data.transactions.length,
    categories: data.categories?.length ?? 0,
  }
}

/** Löscht sämtliche Nutzdaten (Buchungen + Belege). */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.transactions, db.receipts, async () => {
    await db.transactions.clear()
    await db.receipts.clear()
  })
}
