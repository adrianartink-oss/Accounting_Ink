import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import PageHeader from '../components/PageHeader'
import AppLockSetup from '../components/AppLockSetup'

export default function SettingsPage() {
  const settings = useSettings()
  const txs = useTransactions()
  const categories = useCategories()
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader title="Einstellungen" subtitle="Geschäftsdaten, KI, Backup & mehr" />

      <Section title="Darstellung">
        <label className="label">Farbschema</label>
        <select
          className="input"
          value={settings.theme}
          onChange={(e) =>
            updateSettings({ theme: e.target.value as 'system' | 'light' | 'dark' })
          }
        >
          <option value="system">System</option>
          <option value="light">Hell (Creme)</option>
          <option value="dark">Dunkel (Anthrazit)</option>
        </select>
        <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
          Geschäftsdaten (Name, Adresse, Steuernummer, §19-Status …) und Kennzahlen
          findest du jetzt im{' '}
          <button className="underline" style={{ color: 'var(--accent)' }} onClick={() => navigate('/studio')}>
            Studio
          </button>
          .
        </p>
      </Section>

      <Section title="Sicherheit · App-Sperre">
        <AppLockSetup />
      </Section>

      <ApiKeySection />

      <Section title="Verwaltung">
        <button
          className="flex w-full items-center justify-between border-b py-2.5"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => navigate('/categories')}
        >
          <span style={{ color: 'var(--fg)' }}>Kategorien verwalten</span>
          <ChevronRight size={18} color="var(--muted)" />
        </button>
        <button
          className="flex w-full items-center justify-between py-2.5"
          onClick={() => navigate('/recurring')}
        >
          <span style={{ color: 'var(--fg)' }}>Wiederkehrende Buchungen</span>
          <ChevronRight size={18} color="var(--muted)" />
        </button>
      </Section>

      <Section title="Backup & Export">
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
          <Download size={18} /> Alle Buchungen als CSV
        </button>
      </Section>

      <Section title="Daten">
        <button
          className="btn w-full"
          style={{ color: 'var(--expense)' }}
          onClick={async () => {
            if (
              confirm(
                'Wirklich ALLE Buchungen und Belege löschen? Vorher am besten ein Backup exportieren.',
              )
            ) {
              await clearAllData()
            }
          }}
        >
          Alle Buchungen löschen
        </button>
      </Section>

      <p className="mt-6 text-center text-xs" style={{ color: 'var(--muted)' }}>
        Buchhaltung Privat · lokale Daten · Version 0.1.0
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
      setError(
        err instanceof Error
          ? `Key ungültig oder Netzwerkfehler: ${err.message}`
          : 'Unbekannter Fehler',
      )
    }
  }

  return (
    <Section title="KI-Anbindung (Claude)">
      <div className="mb-3 flex items-center gap-2 text-sm">
        <KeyRound size={16} color="var(--accent)" />
        {settings.apiKeyEncrypted ? (
          <span className="flex items-center gap-1" style={{ color: 'var(--income)' }}>
            <CheckCircle2 size={15} /> API-Key hinterlegt
          </span>
        ) : (
          <span style={{ color: 'var(--muted)' }}>Kein API-Key hinterlegt</span>
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
        Wird verschlüsselt lokal gespeichert. Anthropic-Key unter console.anthropic.com erstellen.
      </p>

      <div className="mt-3">
        <label className="label">Modell</label>
        <select
          className="input"
          value={settings.aiModel}
          onChange={(e) => updateSettings({ aiModel: e.target.value as AiModel })}
        >
          <option value="claude-opus-4-8">Claude Opus 4.8 (genauer)</option>
          <option value="claude-haiku-4-5">Claude Haiku 4.5 (schneller & günstiger)</option>
        </select>
      </div>

      <div className="mt-3 flex gap-2">
        <button className="btn btn-primary flex-1" onClick={save} disabled={!key.trim() || status === 'saving'}>
          {status === 'saving' ? <Loader2 size={18} className="animate-spin" /> : null}
          {settings.apiKeyEncrypted ? 'Key ersetzen' : 'Key speichern & testen'}
        </button>
        {settings.apiKeyEncrypted && (
          <button
            className="btn"
            onClick={() => updateSettings({ apiKeyEncrypted: undefined })}
          >
            Entfernen
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
    const pass = prompt(
      'Optionale Passphrase zum Verschlüsseln des Backups.\nLeer lassen = unverschlüsseltes JSON.',
    )
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
        const pass = prompt('Passphrase zum Entschlüsseln des Backups:')
        if (pass === null) return
        text = await decryptString(text, pass.trim())
      }
      const data = JSON.parse(text) as BackupData
      const mode = confirm(
        'OK = Ersetzen (alle aktuellen Daten überschreiben)\nAbbrechen = Zusammenführen',
      )
        ? 'replace'
        : 'merge'
      const result = await importBackup(data, mode)
      setMsg(`Import erfolgreich: ${result.transactions} Buchungen, ${result.categories} Kategorien.`)
    } catch (err) {
      setMsg(
        err instanceof Error
          ? `Fehler: ${err.message} (falsche Passphrase?)`
          : 'Import fehlgeschlagen.',
      )
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn" onClick={exportBackup}>
          <Download size={18} color="var(--accent)" /> Backup
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          <Upload size={18} color="var(--accent)" /> Import
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
          ? 'Noch kein Backup erstellt.'
          : daysSinceBackup === 0
            ? 'Letzte Sicherung: heute.'
            : `Letzte Sicherung: vor ${daysSinceBackup} Tag(en).`}
        {overdue && ' – Zeit für ein neues Backup.'}
      </p>
      <p className="mt-2 flex items-start gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
        <Database size={13} className="mt-0.5 shrink-0" />
        Datei-Backup (JSON), optional per Passphrase AES-verschlüsselt. Belege sind nicht enthalten.
      </p>
      {msg && (
        <p className="mt-2 text-sm" style={{ color: 'var(--fg)' }}>
          {msg}
        </p>
      )}
    </div>
  )
}
