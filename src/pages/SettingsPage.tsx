import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  ChevronRight,
  Database,
  Download,
  KeyRound,
  Loader2,
  Upload,
} from 'lucide-react'
import { useSettings, useTransactions } from '../store/hooks'
import { useCategories } from '../store/hooks'
import { updateSettings } from '../db/schema'
import { decryptString, encryptString, getDeviceSecret } from '../db/crypto'
import { testApiKey } from '../lib/anthropic'
import { buildBackup, clearAllData, importBackup } from '../db/repo'
import { downloadBlob, transactionsToCsv, type BackupData } from '../lib/export'
import type { AiModel } from '../db/types'
import { SUPPORTED_LANGUAGES } from '../i18n'
import PageHeader from '../components/PageHeader'
import AppLockSetup from '../components/AppLockSetup'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const settings = useSettings()
  const txs = useTransactions()
  const categories = useCategories()
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <Section title={t('settings.appearance')}>
        <label className="label">{t('settings.colorScheme')}</label>
        <select
          className="input"
          value={settings.theme}
          onChange={(e) =>
            updateSettings({ theme: e.target.value as 'system' | 'light' | 'dark' })
          }
        >
          <option value="system">{t('settings.themeSystem')}</option>
          <option value="light">{t('settings.themeLight')}</option>
          <option value="dark">{t('settings.themeDark')}</option>
        </select>

        <label className="label mt-4">{t('settings.language')}</label>
        <select
          className="input"
          value={i18n.resolvedLanguage ?? i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag} {l.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs" style={{ color: 'var(--muted)' }}>
          {t('settings.languageHint')}
        </p>

        <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
          {t('settings.studioHintBefore')}
          <button className="underline" style={{ color: 'var(--accent)' }} onClick={() => navigate('/studio')}>
            {t('settings.studioHintLink')}
          </button>
          .
        </p>
      </Section>

      <Section title={t('security.sectionTitle')}>
        <AppLockSetup />
      </Section>

      <ApiKeySection />

      <Section title={t('settings.management')}>
        <button
          className="flex w-full items-center justify-between border-b py-2.5"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => navigate('/categories')}
        >
          <span style={{ color: 'var(--fg)' }}>{t('settings.manageCategories')}</span>
          <ChevronRight size={18} color="var(--muted)" />
        </button>
        <button
          className="flex w-full items-center justify-between py-2.5"
          onClick={() => navigate('/recurring')}
        >
          <span style={{ color: 'var(--fg)' }}>{t('settings.manageRecurring')}</span>
          <ChevronRight size={18} color="var(--muted)" />
        </button>
      </Section>

      <Section title={t('settings.backupTitle')}>
        <BackupControls />
        <button
          className="btn mt-3 w-full"
          disabled={txs.length === 0}
          onClick={() => {
            const csv = transactionsToCsv(txs, categories)
            downloadBlob(
              new Blob([csv], { type: 'text/csv;charset=utf-8' }),
              'buchungen_gesamt.csv',
            )
          }}
        >
          <Download size={18} /> {t('settings.exportCsv')}
        </button>
      </Section>

      <Section title={t('settings.dataTitle')}>
        <button
          className="btn w-full"
          style={{ color: 'var(--expense)' }}
          onClick={async () => {
            if (confirm(t('settings.confirmDeleteAll'))) {
              await clearAllData()
            }
          }}
        >
          {t('settings.deleteAll')}
        </button>
      </Section>

      <p className="mt-6 text-center text-xs" style={{ color: 'var(--muted)' }}>
        {t('settings.footer', { version: '0.1.0' })}
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card mb-4">
      <h2 className="mb-3 font-semibold" style={{ color: 'var(--fg)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function ApiKeySection() {
  const { t } = useTranslation()
  const settings = useSettings()
  const [key, setKey] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!key.trim()) return
    setStatus('saving')
    setError(null)
    try {
      await testApiKey(key.trim(), settings.aiModel)
      const encrypted = await encryptString(key.trim(), getDeviceSecret())
      await updateSettings({ apiKeyEncrypted: encrypted })
      setKey('')
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setError(t('settings.apiKeyError', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  return (
    <Section title={t('settings.aiTitle')}>
      <div className="mb-3 flex items-center gap-2 text-sm">
        <KeyRound size={16} color="var(--accent)" />
        {settings.apiKeyEncrypted ? (
          <span className="flex items-center gap-1" style={{ color: 'var(--income)' }}>
            <CheckCircle2 size={15} /> {t('settings.apiKeySet')}
          </span>
        ) : (
          <span style={{ color: 'var(--muted)' }}>{t('settings.apiKeyNone')}</span>
        )}
      </div>

      <input
        className="input"
        type="password"
        placeholder="sk-ant-…"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        autoComplete="off"
      />
      <p className="mt-1.5 text-xs" style={{ color: 'var(--muted)' }}>
        {t('settings.apiKeyHint')}
      </p>

      <div className="mt-3">
        <label className="label">{t('settings.model')}</label>
        <select
          className="input"
          value={settings.aiModel}
          onChange={(e) => updateSettings({ aiModel: e.target.value as AiModel })}
        >
          <option value="claude-opus-4-8">{t('settings.modelOpus')}</option>
          <option value="claude-haiku-4-5">{t('settings.modelHaiku')}</option>
        </select>
      </div>

      <div className="mt-3 flex gap-2">
        <button className="btn btn-primary flex-1" onClick={save} disabled={!key.trim() || status === 'saving'}>
          {status === 'saving' ? <Loader2 size={18} className="animate-spin" /> : null}
          {settings.apiKeyEncrypted ? t('settings.apiKeyReplace') : t('settings.apiKeySave')}
        </button>
        {settings.apiKeyEncrypted && (
          <button
            className="btn"
            onClick={() => updateSettings({ apiKeyEncrypted: undefined })}
          >
            {t('common.remove')}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm" style={{ color: 'var(--expense)' }}>
          {error}
        </p>
      )}
    </Section>
  )
}

function BackupControls() {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const settings = useSettings()
  const [msg, setMsg] = useState<string | null>(null)

  const daysSinceBackup =
    settings.lastBackupAt != null
      ? Math.floor((Date.now() - settings.lastBackupAt) / 86_400_000)
      : null
  const overdue =
    settings.backupReminderDays > 0 &&
    (daysSinceBackup == null || daysSinceBackup >= settings.backupReminderDays)

  async function exportBackup() {
    const data = await buildBackup()
    const json = JSON.stringify(data, null, 2)
    const date = new Date().toISOString().slice(0, 10)
    const pass = prompt(t('settings.backupPassPrompt'))
    if (pass === null) return // abgebrochen
    if (pass.trim()) {
      const encrypted = await encryptString(json, pass.trim())
      downloadBlob(
        new Blob([encrypted], { type: 'application/octet-stream' }),
        `buchhaltung-backup_${date}.json.enc`,
      )
    } else {
      downloadBlob(
        new Blob([json], { type: 'application/json' }),
        `buchhaltung-backup_${date}.json`,
      )
    }
    await updateSettings({ lastBackupAt: Date.now() })
  }

  async function importFile(file: File) {
    setMsg(null)
    try {
      let text = await file.text()
      // Verschlüsselte Backups beginnen mit "v1." (siehe crypto.ts).
      if (text.startsWith('v1.')) {
        const pass = prompt(t('settings.importPassPrompt'))
        if (pass === null) return
        text = await decryptString(text, pass.trim())
      }
      const data = JSON.parse(text) as BackupData
      const mode = confirm(t('settings.importMode')) ? 'replace' : 'merge'
      const result = await importBackup(data, mode)
      setMsg(t('settings.importSuccess', { tx: result.transactions, cat: result.categories }))
    } catch (err) {
      setMsg(
        err instanceof Error
          ? t('settings.importErrorPass', { error: err.message })
          : t('settings.importErrorGeneric'),
      )
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn" onClick={exportBackup}>
          <Download size={18} color="var(--accent)" /> {t('settings.backupBtn')}
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          <Upload size={18} color="var(--accent)" /> {t('settings.importBtn')}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.enc"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
      />
      <p
        className="mt-2 text-xs"
        style={{ color: overdue ? 'var(--expense)' : 'var(--muted)' }}
      >
        {settings.lastBackupAt == null
          ? t('settings.noBackupYet')
          : daysSinceBackup === 0
            ? t('settings.lastBackupToday')
            : t('settings.lastBackupDays', { count: daysSinceBackup ?? 0 })}
        {overdue && t('settings.backupOverdue')}
      </p>
      <p className="mt-2 flex items-start gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
        <Database size={13} className="mt-0.5 shrink-0" />
        {t('settings.backupNote')}
      </p>
      {msg && (
        <p className="mt-2 text-sm" style={{ color: 'var(--fg)' }}>
          {msg}
        </p>
      )}
    </div>
  )
}
