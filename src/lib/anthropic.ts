import Anthropic from '@anthropic-ai/sdk'
import type { AiModel, Category, Country, Sphere, TxType } from '../db/types'
import { decryptString, getDeviceSecret } from '../db/crypto'
import type { Settings } from '../db/types'

/** Ergebnis einer KI-Extraktion (Beleg-Scan oder Freitext). */
export interface Extraction {
  date: string
  /** Betrag in Cent (positiv). */
  amountCents: number
  type: TxType
  sphere: Sphere
  country: Country
  categoryId: string
  counterparty: string
  description: string
  /** 0..1 Selbsteinschätzung des Modells. */
  confidence: number
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('Kein Anthropic-API-Key hinterlegt. Bitte in den Einstellungen eintragen.')
    this.name = 'MissingApiKeyError'
  }
}

async function buildClient(settings: Settings): Promise<{ client: Anthropic; model: AiModel }> {
  if (!settings.apiKeyEncrypted) throw new MissingApiKeyError()
  const apiKey = await decryptString(settings.apiKeyEncrypted, getDeviceSecret())
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  return { client, model: settings.aiModel }
}

function categoryCatalog(categories: Category[]): string {
  return categories
    .map((c) => `- ${c.id} :: ${c.name} (${c.kind === 'income' ? 'Einnahme' : 'Ausgabe'}, ${c.sphere === 'business' ? 'gewerblich' : 'privat'})`)
    .join('\n')
}

const extractionTool = (categories: Category[]): Anthropic.Tool => ({
  name: 'record_transaction',
  description:
    'Erfasse eine Buchung (Einnahme oder Ausgabe) mit strukturierten Feldern für eine deutsche EÜR-Buchhaltung.',
  input_schema: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: 'Belegdatum im Format YYYY-MM-DD. Falls unklar, heutiges Datum.',
      },
      amount: {
        type: 'number',
        description: 'Bruttobetrag als Dezimalzahl in der Belegwährung, z. B. 42.50',
      },
      type: {
        type: 'string',
        enum: ['income', 'expense'],
        description: 'Einnahme (income) oder Ausgabe (expense).',
      },
      sphere: {
        type: 'string',
        enum: ['business', 'private'],
        description: 'Gewerblich (business) oder privat (private).',
      },
      country: {
        type: 'string',
        enum: ['DE', 'ES'],
        description: 'Land der Buchung (Deutschland DE oder Spanien ES).',
      },
      categoryId: {
        type: 'string',
        description:
          'Die passende Kategorie-ID aus dem bereitgestellten Katalog. Wähle die inhaltlich beste Übereinstimmung.',
        enum: categories.map((c) => c.id),
      },
      counterparty: {
        type: 'string',
        description: 'Name des Händlers/Lieferanten (bei Ausgaben) oder Kunden (bei Einnahmen).',
      },
      description: {
        type: 'string',
        description: 'Kurzer Verwendungszweck / Beschreibung.',
      },
      confidence: {
        type: 'number',
        description: 'Wie sicher bist du (0 bis 1)?',
      },
    },
    required: [
      'date',
      'amount',
      'type',
      'sphere',
      'country',
      'categoryId',
      'counterparty',
      'description',
      'confidence',
    ],
  },
})

interface RawToolInput {
  date: string
  amount: number
  type: TxType
  sphere: Sphere
  country: Country
  categoryId: string
  counterparty: string
  description: string
  confidence: number
}

function normalize(input: RawToolInput, categories: Category[]): Extraction {
  const known = new Set(categories.map((c) => c.id))
  const categoryId = known.has(input.categoryId)
    ? input.categoryId
    : fallbackCategory(input, categories)
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(input.date)
      ? input.date
      : new Date().toISOString().slice(0, 10),
    amountCents: Math.max(0, Math.round((Number(input.amount) || 0) * 100)),
    type: input.type === 'income' ? 'income' : 'expense',
    sphere: input.sphere === 'private' ? 'private' : 'business',
    country: input.country === 'ES' ? 'ES' : 'DE',
    categoryId,
    counterparty: input.counterparty ?? '',
    description: input.description ?? '',
    confidence: Math.min(1, Math.max(0, Number(input.confidence) || 0)),
  }
}

function fallbackCategory(input: RawToolInput, categories: Category[]): string {
  const match = categories.find(
    (c) => c.kind === input.type && c.sphere === input.sphere,
  )
  return match?.id ?? categories[0]?.id ?? ''
}

function extractToolInput(message: Anthropic.Message): RawToolInput {
  const block = message.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') {
    throw new Error('Claude hat keine strukturierten Daten zurückgegeben.')
  }
  return block.input as RawToolInput
}

/** Extrahiert eine Buchung aus einem Belegbild (base64, ohne data:-Präfix). */
export async function scanReceipt(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
  categories: Category[],
  settings: Settings,
): Promise<Extraction> {
  const { client, model } = await buildClient(settings)
  const tool = extractionTool(categories)
  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text:
              `Analysiere diesen Beleg für eine deutsche EÜR-Buchhaltung eines Tätowierers.\n` +
              `Heutiges Datum: ${new Date().toISOString().slice(0, 10)}.\n` +
              `Verfügbare Kategorien:\n${categoryCatalog(categories)}\n\n` +
              `Erfasse die Buchung über das Tool record_transaction. Wähle die passendste ` +
              `Kategorie-ID. Ordne Land (DE/ES) und Sphäre (gewerblich/privat) bestmöglich zu.`,
          },
        ],
      },
    ],
  })
  return normalize(extractToolInput(message), categories)
}

/** Wandelt eine natürlichsprachige Eingabe in eine Buchung um. */
export async function parseNaturalLanguage(
  text: string,
  categories: Category[],
  settings: Settings,
): Promise<Extraction> {
  const { client, model } = await buildClient(settings)
  const tool = extractionTool(categories)
  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
    messages: [
      {
        role: 'user',
        content:
          `Wandle die folgende Notiz in eine Buchung für eine deutsche EÜR-Buchhaltung um.\n` +
          `Heutiges Datum: ${new Date().toISOString().slice(0, 10)}. ` +
          `Standardland: ${settings.defaultCountry}.\n` +
          `Verfügbare Kategorien:\n${categoryCatalog(categories)}\n\n` +
          `Notiz: "${text}"\n\nErfasse sie über das Tool record_transaction.`,
      },
    ],
  })
  return normalize(extractToolInput(message), categories)
}

/**
 * Erzeugt eine kurze, natürlichsprachige Zusammenfassung + Plausibilitäts-
 * hinweise für einen Zeitraum. `report` ist eine bereits aggregierte
 * Textdarstellung (Kategorien + Summen), um Token zu sparen.
 */
export async function summarizePeriod(
  report: string,
  periodLabel: string,
  settings: Settings,
): Promise<string> {
  const { client, model } = await buildClient(settings)
  const message = await client.messages.create({
    model,
    max_tokens: 700,
    messages: [
      {
        role: 'user',
        content:
          `Du bist Buchhaltungs-Assistent für einen selbständigen Tätowierer (EÜR).\n` +
          `Fasse den folgenden Zeitraum (${periodLabel}) in 4-6 knappen deutschen ` +
          `Stichpunkten zusammen: wichtigste Zahlen, auffällige Kategorien und – ` +
          `wo sinnvoll – Plausibilitäts-/Sparhinweise. Keine Steuerberatung, keine ` +
          `Rechtsauskunft. Antworte nur mit den Stichpunkten.\n\n${report}`,
      },
    ],
  })
  return message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim()
}

/** Prüft einen API-Key mit einem minimalen Test-Request. */
export async function testApiKey(apiKey: string, model: AiModel): Promise<boolean> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  await client.messages.create({
    model,
    max_tokens: 8,
    messages: [{ role: 'user', content: 'ping' }],
  })
  return true
}
