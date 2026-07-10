import { createWorker } from 'tesseract.js'
import { parseAmountToCents } from './money'

/** Ergebnis der lokalen Beleg-Erkennung. */
export interface OcrResult {
  /** Erkannter Gesamtbetrag in Cent (falls gefunden). */
  amountCents?: number
  /** Erkanntes Datum als YYYY-MM-DD (falls gefunden). */
  date?: string
  /** Vermuteter Händler/Name (erste sinnvolle Zeile). */
  vendor?: string
  /** Roher OCR-Text (für Debug/Anzeige). */
  rawText: string
}

// Schlüsselwörter, die typischerweise in der Summenzeile eines Belegs stehen.
const TOTAL_KEYWORDS = [
  'summe',
  'gesamt',
  'gesamtbetrag',
  'total',
  'zu zahlen',
  'zahlbetrag',
  'betrag',
  'bar',
  'kartenzahlung',
  'ec-cash',
  'girocard',
]
// Zeilen, die zwar einen Betrag enthalten, aber NICHT die Endsumme sind.
const EXCLUDE_KEYWORDS = ['zwischensumme', 'rückgeld', 'ruckgeld', 'gegeben', 'mwst', 'ust', 'netto']

const AMOUNT_RE = /(?<!\d)\d{1,4}(?:[.\s]\d{3})*[.,]\d{2}(?!\d)/g

function amountsInLine(line: string): number[] {
  const matches = line.match(AMOUNT_RE) ?? []
  return matches
    .map((m) => parseAmountToCents(m.replace(/\s/g, '')))
    .filter((c): c is number => c != null && c > 0)
}

/** Extrahiert den wahrscheinlichsten Gesamtbetrag aus den Belegzeilen. */
function extractAmountCents(lines: string[]): number | undefined {
  // 1) Bevorzugt Zeilen mit Summen-Schlüsselwort (ohne Ausschlusswörter).
  const keyworded: number[] = []
  for (const line of lines) {
    const lower = line.toLowerCase()
    if (EXCLUDE_KEYWORDS.some((k) => lower.includes(k))) continue
    if (TOTAL_KEYWORDS.some((k) => lower.includes(k))) {
      keyworded.push(...amountsInLine(line))
    }
  }
  if (keyworded.length) return Math.max(...keyworded)

  // 2) Sonst der größte Betrag im gesamten Beleg (üblicherweise die Summe).
  const all: number[] = []
  for (const line of lines) {
    const lower = line.toLowerCase()
    if (EXCLUDE_KEYWORDS.some((k) => lower.includes(k))) continue
    all.push(...amountsInLine(line))
  }
  return all.length ? Math.max(...all) : undefined
}

const DATE_RE = /\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})\b/

/** Extrahiert das erste plausible Datum und normalisiert es zu YYYY-MM-DD. */
function extractDate(text: string): string | undefined {
  const m = text.match(DATE_RE)
  if (!m) return undefined
  const day = Number.parseInt(m[1], 10)
  const month = Number.parseInt(m[2], 10)
  let year = Number.parseInt(m[3], 10)
  if (year < 100) year += 2000
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
  if (year < 2000 || year > 2100) return undefined
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)}`
}

/** Rät den Händler/Namen aus den obersten Textzeilen. */
function extractVendor(lines: string[]): string | undefined {
  // Lokale, nicht-globale Regexe (kein lastIndex-Zustand bei .test()).
  const hasLetters = /[a-zA-ZäöüÄÖÜ]/
  const looksLikeDate = /\b\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\b/
  const looksLikeAmount = /\d[.,]\d{2}\b/
  for (const line of lines.slice(0, 6)) {
    const t = line.trim()
    if (t.length >= 3 && hasLetters.test(t) && !looksLikeDate.test(t) && !looksLikeAmount.test(t)) {
      return t.slice(0, 60)
    }
  }
  return undefined
}

/**
 * Parst rohen OCR-Text eines Belegs zu strukturierten Feldern.
 * Rein funktional (ohne Tesseract) – dadurch unit-testbar.
 */
export function parseReceiptText(text: string): OcrResult {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return {
    amountCents: extractAmountCents(lines),
    date: extractDate(text),
    vendor: extractVendor(lines),
    rawText: text,
  }
}

/**
 * Erkennt einen Beleg lokal im Browser (Tesseract/WASM, deutsches Modell).
 * Kein API-Key, kein Server – das Bild verlässt das Gerät nicht.
 * Das Erkennungsmodell wird beim ersten Mal einmalig geladen (Internet nötig),
 * danach vom Browser gecacht.
 */
export async function recognizeReceipt(
  image: Blob | File,
  onProgress?: (fraction: number) => void,
): Promise<OcrResult> {
  const worker = await createWorker('deu', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress)
    },
  })
  try {
    const { data } = await worker.recognize(image)
    return parseReceiptText(data.text)
  } finally {
    await worker.terminate()
  }
}
