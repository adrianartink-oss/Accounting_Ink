import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Camera, ImageUp, Loader2, Sparkles, KeyRound, ScanText } from 'lucide-react'
import { useCategories, useSettings } from '../store/hooks'
import { prepareImage } from '../lib/image'
import { addReceipt } from '../db/repo'
import {
  MissingApiKeyError,
  QuotaExceededError,
  managedAiEnabled,
  parseNaturalLanguage,
  parseNaturalLanguageManaged,
  scanReceipt,
  scanReceiptManaged,
  type Extraction,
} from '../lib/anthropic'
import type { TransactionFormValues } from '../components/TransactionForm'
import PageHeader from '../components/PageHeader'

type Engine = 'local' | 'claude'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function Scan() {
  const { t } = useTranslation()
  const settings = useSettings()
  const categories = useCategories()
  const navigate = useNavigate()
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const managed = managedAiEnabled()
  const hasKey = Boolean(settings.apiKeyEncrypted)
  // Mit Managed-AI (Server-Proxy) braucht der Nutzer keinen eigenen Key.
  const aiAvailable = hasKey || managed
  const [engine, setEngine] = useState<Engine>('local')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')

  const claudeReady = engine === 'claude' && aiAvailable
  const canScan = engine === 'local' || claudeReady

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
    if (err instanceof QuotaExceededError) setError(t('accessGate.quotaExceeded'))
    else if (err instanceof MissingApiKeyError) setError(err.message)
    else setError(t('scan.analysisFailed', { error: err instanceof Error ? err.message : String(err) }))
  }

  async function handleImage(file: File) {
    setError(null)
    setBusy(true)
    setProgress(0)
    try {
      const prepared = await prepareImage(file)
      if (engine === 'local') {
        setStatus(t('scan.statusModelLoading'))
        // Tesseract nur bei Bedarf laden (eigener Chunk).
        const { recognizeReceipt } = await import('../lib/ocr')
        setStatus(t('scan.statusLocalRecognizing'))
        const result = await recognizeReceipt(file, (p) => setProgress(p))
        const receiptId = await addReceipt(prepared.blob, prepared.thumbnail)
        const prefill: Partial<TransactionFormValues> = {
          type: 'expense',
          sphere: 'business',
          country: settings.defaultCountry,
          date: result.date ?? today(),
        }
        if (result.amountCents != null) prefill.amountCents = result.amountCents
        if (result.vendor) prefill.counterparty = result.vendor
        navigate('/add', { state: { prefill, receiptId, fromAi: true } })
      } else {
        setStatus(t('scan.statusClaudeAnalyzing'))
        const extraction = managed
          ? await scanReceiptManaged(prepared.base64, prepared.mediaType, categories, settings)
          : await scanReceipt(prepared.base64, prepared.mediaType, categories, settings)
        const receiptId = await addReceipt(prepared.blob, prepared.thumbnail)
        navigate('/add', { state: { prefill: extractionToPrefill(extraction), receiptId, fromAi: true } })
      }
    } catch (err) {
      handleError(err)
    } finally {
      setBusy(false)
      setStatus('')
    }
  }

  async function handleText() {
    if (!text.trim() || !aiAvailable) return
    setError(null)
    setBusy(true)
    try {
      const extraction = managed
        ? await parseNaturalLanguageManaged(text.trim(), categories, settings)
        : await parseNaturalLanguage(text.trim(), categories, settings)
      navigate('/add', { state: { prefill: extractionToPrefill(extraction), fromAi: true } })
    } catch (err) {
      handleError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title={t('scan.title')} subtitle={t('scan.subtitle')} />

      {/* Methode wählen */}
      <div
        className="mb-4 grid grid-cols-2 gap-1 rounded-xl p-1"
        style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}
      >
        <EngineTab
          active={engine === 'local'}
          onClick={() => setEngine('local')}
          icon={<ScanText size={16} />}
          title={t('scan.localTab')}
          hint={t('scan.localHint')}
        />
        <EngineTab
          active={engine === 'claude'}
          onClick={() => setEngine('claude')}
          icon={<Sparkles size={16} />}
          title={t('scan.claudeTab')}
          hint={t('scan.claudeHint')}
        />
      </div>

      {engine === 'local' ? (
        <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
          {t('scan.localDesc')}
        </p>
      ) : !aiAvailable ? (
        <div className="card mb-4 flex items-start gap-3" style={{ borderColor: 'var(--accent)' }}>
          <KeyRound size={20} color="var(--accent)" className="mt-0.5 shrink-0" />
          <div className="text-sm" style={{ color: 'var(--fg)' }}>
            <p className="font-medium">{t('scan.claudeNoKeyTitle')}</p>
            <p className="mt-0.5" style={{ color: 'var(--muted)' }}>
              {t('scan.claudeNoKeyBefore')}
              <button
                className="underline"
                style={{ color: 'var(--accent)' }}
                onClick={() => navigate('/settings')}
              >
                {t('scan.claudeNoKeyLink')}
              </button>
              .
            </p>
          </div>
        </div>
      ) : (
        <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
          {t('scan.claudeDesc')}
        </p>
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
          <p style={{ color: 'var(--muted)' }}>{status || t('scan.processing')}</p>
          {engine === 'local' && progress > 0 && (
            <div className="h-2 w-48 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.round(progress * 100)}%`, background: 'var(--accent)' }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            className="card flex flex-col items-center justify-center gap-2 py-8 disabled:opacity-50"
            disabled={!canScan}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera size={28} color="var(--accent)" />
            <span className="font-medium" style={{ color: 'var(--fg)' }}>
              {t('scan.takePhoto')}
            </span>
          </button>
          <button
            className="card flex flex-col items-center justify-center gap-2 py-8 disabled:opacity-50"
            disabled={!canScan}
            onClick={() => fileRef.current?.click()}
          >
            <ImageUp size={28} color="var(--accent)" />
            <span className="font-medium" style={{ color: 'var(--fg)' }}>
              {t('scan.chooseImage')}
            </span>
          </button>
        </div>
      )}

      {/* Freitext-Eingabe (nur mit Claude/Key) */}
      <div className="card mt-5">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles size={18} color="var(--accent)" />
          <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>
            {t('scan.textTitle')}
          </h2>
        </div>
        <p className="mb-3 text-sm" style={{ color: 'var(--muted)' }}>
          {t('scan.textDesc')}
        </p>
        <textarea
          className="input min-h-24 resize-none"
          placeholder={t('scan.textPlaceholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="btn btn-primary mt-3 w-full"
          disabled={!aiAvailable || !text.trim() || busy}
          onClick={handleText}
        >
          <Sparkles size={18} /> {t('scan.toTransaction')}
        </button>
      </div>

      {error && (
        <div className="card mt-4 text-sm" style={{ borderColor: 'var(--expense)', color: 'var(--expense)' }}>
          {error}
        </div>
      )}
    </div>
  )
}

function EngineTab({
  active,
  onClick,
  icon,
  title,
  hint,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  hint: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition active:scale-[0.98]"
      style={{
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--accent-fg)' : 'var(--muted)',
      }}
    >
      {icon}
      <span>{title}</span>
      <span className="text-xs opacity-70">· {hint}</span>
    </button>
  )
}
