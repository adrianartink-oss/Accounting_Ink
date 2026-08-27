// Server-Proxy für die Claude-Belegerkennung (Managed-AI).
//
// Zweck: Der Anthropic-API-Key bleibt serverseitig – Nutzer brauchen keinen
// eigenen Key. Vor jedem Aufruf werden Code + Gerät geprüft und ein monatliches
// Scan-Limit pro Code durchgesetzt (Kostendeckel / Missbrauchsschutz).
//
// Nur aktiv, wenn ANTHROPIC_API_KEY gesetzt ist. Modell: Haiku (günstig).
import { getStore } from '@netlify/blobs'
import Anthropic from '@anthropic-ai/sdk'

interface CatLite {
  id: string
  name: string
  kind: 'income' | 'expense'
  sphere: 'business' | 'private'
}

interface CodeRecord {
  boundDevices?: string[]
  scanLimit?: number
  usage?: Record<string, number>
  revoked?: boolean
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function buildTool(categories: CatLite[], countryCodes: string[]): Anthropic.Tool {
  return {
    name: 'record_transaction',
    description:
      'Erfasse eine Buchung (Einnahme oder Ausgabe) für eine deutsche EÜR-Buchhaltung.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Belegdatum YYYY-MM-DD, sonst heute.' },
        amount: { type: 'number', description: 'Bruttobetrag als Dezimalzahl, z. B. 42.50' },
        type: { type: 'string', enum: ['income', 'expense'] },
        sphere: { type: 'string', enum: ['business', 'private'] },
        country: { type: 'string', enum: countryCodes },
        categoryId: { type: 'string', enum: categories.map((c) => c.id) },
        counterparty: { type: 'string' },
        description: { type: 'string' },
        confidence: { type: 'number' },
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
  }
}

function catalog(categories: CatLite[]): string {
  return categories
    .map(
      (c) =>
        `- ${c.id} :: ${c.name} (${c.kind === 'income' ? 'Einnahme' : 'Ausgabe'}, ${
          c.sphere === 'business' ? 'gewerblich' : 'privat'
        })`,
    )
    .join('\n')
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalize(input: any, categories: CatLite[], countryCodes: string[], defaultCountry: string) {
  const known = new Set(categories.map((c) => c.id))
  const today = new Date().toISOString().slice(0, 10)
  const type = input.type === 'income' ? 'income' : 'expense'
  const sphere = input.sphere === 'private' ? 'private' : 'business'
  const categoryId = known.has(input.categoryId)
    ? input.categoryId
    : categories.find((c) => c.kind === type && c.sphere === sphere)?.id ?? categories[0]?.id ?? ''
  const country = countryCodes.includes(input.country) ? input.country : defaultCountry
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : today,
    amountCents: Math.max(0, Math.round((Number(input.amount) || 0) * 100)),
    type,
    sphere,
    country,
    categoryId,
    counterparty: input.counterparty ?? '',
    description: input.description ?? '',
    confidence: Math.min(1, Math.max(0, Number(input.confidence) || 0)),
  }
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return json({ ok: false, error: 'not-configured' }, 500)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'bad-request' }, 400)
  }

  const code = String(body.code || '').trim().toUpperCase()
  const device = String(body.device || '').trim()

  const store = getStore({ name: 'access-codes', consistency: 'strong' })
  const rec = (await store.get(code, { type: 'json' })) as CodeRecord | null
  if (!rec || rec.revoked || !Array.isArray(rec.boundDevices) || !rec.boundDevices.includes(device)) {
    return json({ ok: false, reason: 'invalid' }, 403)
  }

  const monthKey = new Date().toISOString().slice(0, 7)
  const usage = rec.usage || {}
  const used = usage[monthKey] || 0
  if ((rec.scanLimit ?? 0) > 0 && used >= (rec.scanLimit ?? 0)) {
    return json({ ok: false, reason: 'quota' }, 429)
  }

  const categories: CatLite[] = Array.isArray(body.categories) ? body.categories : []
  const countryCodes: string[] =
    Array.isArray(body.countryCodes) && body.countryCodes.length ? body.countryCodes : ['DE']
  const defaultCountry = String(body.defaultCountry || 'DE')
  const today = new Date().toISOString().slice(0, 10)

  const client = new Anthropic({ apiKey })
  const tool = buildTool(categories, countryCodes)

  let content: Anthropic.MessageParam['content']
  if (body.mode === 'text') {
    content =
      `Wandle die folgende Notiz in eine Buchung für eine deutsche EÜR-Buchhaltung um.\n` +
      `Heutiges Datum: ${today}. Standardland: ${defaultCountry}.\n` +
      `Verfügbare Kategorien:\n${catalog(categories)}\n\n` +
      `Notiz: "${String(body.text || '')}"\n\nErfasse sie über das Tool record_transaction.`
  } else {
    content = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: body.mediaType || 'image/jpeg',
          data: String(body.image || ''),
        },
      },
      {
        type: 'text',
        text:
          `Analysiere diesen Beleg für eine deutsche EÜR-Buchhaltung eines Tätowierers.\n` +
          `Heutiges Datum: ${today}.\n` +
          `Verfügbare Kategorien:\n${catalog(categories)}\n\n` +
          `Erfasse die Buchung über das Tool record_transaction. Wähle die passendste ` +
          `Kategorie-ID und ordne EU-Land und Sphäre bestmöglich zu.`,
      },
    ]
  }

  let message
  try {
    message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content }],
    })
  } catch (err: any) {
    return json({ ok: false, error: err?.message || 'ai-error' }, 502)
  }

  const block = message.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') {
    return json({ ok: false, error: 'no-structured-output' }, 502)
  }
  const extraction = normalize(block.input, categories, countryCodes, defaultCountry)

  usage[monthKey] = used + 1
  rec.usage = usage
  await store.setJSON(code, rec)

  return json({ ok: true, extraction })
}
