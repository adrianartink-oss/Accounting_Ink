import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, ImageUp, Loader2, Sparkles, KeyRound } from 'lucide-react'
import { useCategories, useSettings } from '../store/hooks'
import { prepareImage } from '../lib/image'
import { addReceipt } from '../db/repo'
import {
  MissingApiKeyError,
  parseNaturalLanguage,
  scanReceipt,
  type Extraction,
} from '../lib/anthropic'
import type { TransactionFormValues } from '../components/TransactionForm'
import PageHeader from '../components/PageHeader'

export default function Scan() {
  const settings = useSettings()
  const categories = useCategories()
  const navigate = useNavigate()
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')

  const hasKey = Boolean(settings.apiKeyEncrypted)

  function extractionToPrefill(ex: Extraction): Partial<TransactionFormValues> {
    return {
      type: ex.type,
      sphere: ex.sphere,
      country: ex.country,
      categoryId: ex.categoryId,
      amountCents: ex.amountCents,
      date: ex.date,
      counterparty: ex.counterparty,
      description: ex.description,
    }
  }

  function handleError(err: unknown) {
    if (err instanceof MissingApiKeyError) {
      setError(err.message)
    } else {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Analyse fehlgeschlagen: ${msg}`)
    }
  }

  async function handleImage(file: File) {
    setError(null)
    setBusy(true)
    try {
      const prepared = await prepareImage(file)
      const extraction = await scanReceipt(
        prepared.base64,
        prepared.mediaType,
        categories,
        settings,
      )
      const receiptId = await addReceipt(prepared.blob, prepared.thumbnail)
      navigate('/add', {
        state: { prefill: extractionToPrefill(extraction), receiptId, fromAi: true },
      })
    } catch (err) {
      handleError(err)
    } finally {
      setBusy(false)
    }
  }

  async function handleText() {
    if (!text.trim()) return
    setError(null)
    setBusy(true)
    try {
      const extraction = await parseNaturalLanguage(text.trim(), categories, settings)
      navigate('/add', {
        state: { prefill: extractionToPrefill(extraction), fromAi: true },
      })
    } catch (err) {
      handleError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Beleg scannen"
        subtitle="Claude liest Betrag, Datum & Kategorie aus – du bestätigst nur noch"
      />

      {!hasKey && (
        <div
          className="card mb-4 flex items-start gap-3"
          style={{ borderColor: 'var(--accent)' }}
        >
          <KeyRound size={20} color="var(--accent)" className="mt-0.5 shrink-0" />
          <div className="text-sm" style={{ color: 'var(--fg)' }}>
            <p className="font-medium">Noch kein API-Key hinterlegt</p>
            <p className="mt-0.5" style={{ color: 'var(--muted)' }}>
              Für den KI-Beleg-Scan brauchst du deinen Anthropic-API-Key.{' '}
              <button
                className="underline"
                style={{ color: 'var(--accent)' }}
                onClick={() => navigate('/settings')}
              >
                In den Einstellungen eintragen
              </button>
            </p>
          </div>
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
      />

      {busy ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 size={32} className="animate-spin" color="var(--accent)" />
          <p style={{ color: 'var(--muted)' }}>Claude analysiert den Beleg…</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            className="card flex flex-col items-center justify-center gap-2 py-8 disabled:opacity-50"
            disabled={!hasKey}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera size={28} color="var(--accent)" />
            <span className="font-medium" style={{ color: 'var(--fg)' }}>
              Foto aufnehmen
            </span>
          </button>
          <button
            className="card flex flex-col items-center justify-center gap-2 py-8 disabled:opacity-50"
            disabled={!hasKey}
            onClick={() => fileRef.current?.click()}
          >
            <ImageUp size={28} color="var(--accent)" />
            <span className="font-medium" style={{ color: 'var(--fg)' }}>
              Bild wählen
            </span>
          </button>
        </div>
      )}

      {/* Freitext-Eingabe */}
      <div className="card mt-5">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles size={18} color="var(--accent)" />
          <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>
            Oder per Text
          </h2>
        </div>
        <p className="mb-3 text-sm" style={{ color: 'var(--muted)' }}>
          Beschreibe die Buchung in Worten, z. B. „42,50 € Tattoo-Nadeln bei Killer Ink".
        </p>
        <textarea
          className="input min-h-24 resize-none"
          placeholder="42,50 € Tattoo-Farben bei Eternal Ink, gestern"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="btn btn-primary mt-3 w-full"
          disabled={!hasKey || !text.trim() || busy}
          onClick={handleText}
        >
          <Sparkles size={18} /> In Buchung umwandeln
        </button>
      </div>

      {error && (
        <div
          className="card mt-4 text-sm"
          style={{ borderColor: 'var(--expense)', color: 'var(--expense)' }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
