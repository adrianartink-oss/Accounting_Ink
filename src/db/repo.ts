import { db } from './schema'
import type { Category, Receipt, Transaction } from './types'
import type { BackupData } from '../lib/export'

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

/** Legt eine benutzerdefinierte Kategorie an. */
export async function addCategory(input: Omit<Category, 'id' | 'custom'>): Promise<string> {
  const cat: Category = { ...input, id: uid(), custom: true }
  await db.categories.add(cat)
  return cat.id
}

/** Löscht eine (benutzerdefinierte) Kategorie. */
export async function deleteCategory(id: string): Promise<void> {
  await db.categories.delete(id)
}

/** Erstellt ein Backup-Objekt aus allen Buchungen und Kategorien. */
export async function buildBackup(): Promise<BackupData> {
  const [transactions, categories] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
  ])
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    categories,
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
  await db.transaction('rw', db.transactions, db.categories, async () => {
    if (mode === 'replace') {
      await db.transactions.clear()
      await db.categories.clear()
    }
    if (data.categories?.length) await db.categories.bulkPut(data.categories)
    if (data.transactions?.length) await db.transactions.bulkPut(data.transactions)
  })
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
