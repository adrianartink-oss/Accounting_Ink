import type { Category, RecurringRule, Transaction } from '../db/types'
import { centsToInputString } from './money'

/** Löst einen Datei-Download im Browser aus. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // URL nach kurzem Delay freigeben (Safari braucht das).
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function csvEscape(value: string): string {
  if (/[";\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const SPHERE_LABEL: Record<string, string> = {
  business: 'Gewerblich',
  private: 'Privat',
}

const TYPE_LABEL: Record<string, string> = {
  income: 'Einnahme',
  expense: 'Ausgabe',
}

/**
 * Erzeugt eine CSV-Datei (Semikolon-getrennt, de-DE-Zahlen) für den
 * Steuerberater. Enthält SKR03-Codes zur einfachen Zuordnung.
 */
export function transactionsToCsv(
  txs: Transaction[],
  categories: Category[],
): string {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const header = [
    'Datum',
    'Art',
    'Betrag',
    'Währung',
    'Sphäre',
    'Land',
    'Kategorie',
    'SKR03',
    'USt-%',
    'Gegenpartei',
    'Beschreibung',
  ]

  const rows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((tx) => {
      const cat = byId.get(tx.categoryId)
      const signed =
        (tx.type === 'expense' ? '-' : '') + centsToInputString(tx.amountCents)
      const vat = tx.vatRateBps == null ? '' : (tx.vatRateBps / 100).toString()
      return [
        tx.date,
        TYPE_LABEL[tx.type],
        signed,
        tx.currency,
        SPHERE_LABEL[tx.sphere],
        tx.country,
        cat?.name ?? tx.categoryId,
        cat?.skr03Code ?? '',
        vat,
        tx.counterparty,
        tx.description,
      ]
        .map((v) => csvEscape(String(v)))
        .join(';')
    })

  // BOM für korrekte Umlaute in Excel.
  return '﻿' + [header.join(';'), ...rows].join('\r\n')
}

/** Vollständiger Datenexport (Buchungen + Kategorien + Regeln) als JSON-Objekt. */
export interface BackupData {
  version: 1
  exportedAt: string
  transactions: Transaction[]
  categories: Category[]
  /** Wiederkehrende Regeln (optional, seit v0.2). */
  recurring?: RecurringRule[]
}
