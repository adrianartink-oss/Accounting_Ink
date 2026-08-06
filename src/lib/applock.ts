// App-Sperre (Zugriffsschutz per Passwort).
//
// Zweck: Verhindert, dass jemand, der das Gerät in die Hand nimmt oder findet,
// die Buchhaltung sieht. Die App ist local-first – jede Person nutzt sie auf
// ihrem eigenen Gerät, die Daten sind ohnehin voneinander getrennt. Diese
// Sperre ist ein Zugriffsschloss, KEINE Verschlüsselung der Daten auf der
// Festplatte (bewusste Entscheidung: kein Risiko, dass ein vergessenes Passwort
// die Buchhaltung unwiederbringlich sperrt).
//
// Ablage:
//  - localStorage: Verifizierungs-Token (mit dem Passwort AES-verschlüsselt) +
//    Auto-Sperr-Dauer. Übersteht Neustarts.
//  - sessionStorage: Zeitpunkt, bis zu dem entsperrt ist. Wird beim Schließen
//    des Tabs/der App gelöscht → beim nächsten Start wieder gesperrt.

import { encryptString, decryptString } from '../db/crypto'

const LOCK_KEY = 'bh_applock_v1'
const SESSION_KEY = 'bh_unlocked_until_v1'
const CHANGED_EVENT = 'bh-lock-changed'

/** Fester Klartext, dessen erfolgreiche Entschlüsselung das Passwort bestätigt. */
const VERIFY_TOKEN = 'bh-applock-ok'

/** ~1 Jahr in ms – „praktisch unbegrenzt" für die Option „nur beim Neustart". */
const EFFECTIVELY_FOREVER_MS = 365 * 24 * 60 * 60 * 1000

interface LockConfig {
  /** Mit dem Passwort verschlüsselter VERIFY_TOKEN. */
  verifier: string
  /** Auto-Sperre nach X Minuten Inaktivität; 0 = nur beim Neustart. */
  autoLockMin: number
}

function readConfig(): LockConfig | null {
  const raw = localStorage.getItem(LOCK_KEY)
  if (!raw) return null
  try {
    const cfg = JSON.parse(raw) as Partial<LockConfig>
    if (typeof cfg.verifier !== 'string') return null
    return { verifier: cfg.verifier, autoLockMin: cfg.autoLockMin ?? 5 }
  } catch {
    return null
  }
}

function writeConfig(cfg: LockConfig): void {
  localStorage.setItem(LOCK_KEY, JSON.stringify(cfg))
}

/** Signalisiert allen Hörern (z. B. dem Gate), dass sich die Sperre änderte. */
export function notifyLockChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED_EVENT))
}

export const LOCK_CHANGED_EVENT = CHANGED_EVENT

/** Ist überhaupt ein App-Passwort gesetzt? */
export function isLockEnabled(): boolean {
  return readConfig() !== null
}

/** Auto-Sperr-Dauer in Minuten (0 = nur beim Neustart). */
export function getAutoLockMinutes(): number {
  return readConfig()?.autoLockMin ?? 5
}

/** Setzt/ändert das App-Passwort und entsperrt die aktuelle Sitzung. */
export async function setPassphrase(passphrase: string, autoLockMin?: number): Promise<void> {
  const verifier = await encryptString(VERIFY_TOKEN, passphrase)
  writeConfig({ verifier, autoLockMin: autoLockMin ?? getAutoLockMinutes() })
  markUnlocked()
  notifyLockChanged()
}

/** Ändert nur die Auto-Sperr-Dauer (falls eine Sperre aktiv ist). */
export function setAutoLockMinutes(min: number): void {
  const cfg = readConfig()
  if (!cfg) return
  writeConfig({ ...cfg, autoLockMin: min })
  notifyLockChanged()
}

/** Prüft ein eingegebenes Passwort gegen das gespeicherte Token. */
export async function verifyPassphrase(passphrase: string): Promise<boolean> {
  const cfg = readConfig()
  if (!cfg) return false
  try {
    return (await decryptString(cfg.verifier, passphrase)) === VERIFY_TOKEN
  } catch {
    return false
  }
}

/** Entfernt die App-Sperre vollständig. */
export function removeLock(): void {
  localStorage.removeItem(LOCK_KEY)
  sessionStorage.removeItem(SESSION_KEY)
  notifyLockChanged()
}

/** Markiert die Sitzung als entsperrt (setzt/erneuert das Ablaufdatum). */
export function markUnlocked(): void {
  const min = getAutoLockMinutes()
  const until = min <= 0 ? Date.now() + EFFECTIVELY_FOREVER_MS : Date.now() + min * 60_000
  sessionStorage.setItem(SESSION_KEY, String(until))
}

/** Ist die Sitzung aktuell entsperrt? (true, wenn keine Sperre aktiv ist.) */
export function isUnlocked(): boolean {
  if (!isLockEnabled()) return true
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return false
  const until = Number(raw)
  return Number.isFinite(until) && Date.now() < until
}

/** Verlängert das Entsperr-Fenster bei Aktivität (nur wenn bereits entsperrt). */
export function refreshUnlock(): void {
  if (isUnlocked()) markUnlocked()
}

/** Sperrt sofort (beendet die entsperrte Sitzung). */
export function lockNow(): void {
  sessionStorage.removeItem(SESSION_KEY)
  notifyLockChanged()
}
