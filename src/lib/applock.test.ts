import { beforeEach, describe, expect, it } from 'vitest'
import {
  getAutoLockMinutes,
  isLockEnabled,
  isUnlocked,
  lockNow,
  markUnlocked,
  removeLock,
  setAutoLockMinutes,
  setPassphrase,
  verifyPassphrase,
} from './applock'

/** Minimaler In-Memory-Ersatz für Web-Storage (Node-Testumgebung). */
class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string): string | null {
    return this.m.has(k) ? (this.m.get(k) as string) : null
  }
  setItem(k: string, v: string): void {
    this.m.set(k, String(v))
  }
  removeItem(k: string): void {
    this.m.delete(k)
  }
  clear(): void {
    this.m.clear()
  }
}

beforeEach(() => {
  ;(globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage()
  ;(globalThis as unknown as { sessionStorage: MemStorage }).sessionStorage = new MemStorage()
})

describe('applock', () => {
  it('ist standardmäßig nicht aktiv und gilt als entsperrt', () => {
    expect(isLockEnabled()).toBe(false)
    expect(isUnlocked()).toBe(true) // ohne Sperre immer entsperrt
  })

  it('aktiviert die Sperre und akzeptiert nur das richtige Passwort', async () => {
    await setPassphrase('geheim123', 5)
    expect(isLockEnabled()).toBe(true)
    expect(await verifyPassphrase('geheim123')).toBe(true)
    expect(await verifyPassphrase('falsch')).toBe(false)
  })

  it('entsperrt die Sitzung beim Setzen des Passworts', async () => {
    await setPassphrase('geheim123', 5)
    expect(isUnlocked()).toBe(true)
  })

  it('sperrt sofort über lockNow', async () => {
    await setPassphrase('geheim123', 5)
    lockNow()
    expect(isUnlocked()).toBe(false)
  })

  it('entfernt die Sperre vollständig', async () => {
    await setPassphrase('geheim123', 5)
    removeLock()
    expect(isLockEnabled()).toBe(false)
    expect(await verifyPassphrase('geheim123')).toBe(false)
  })

  it('behält und ändert die Auto-Sperr-Dauer', async () => {
    await setPassphrase('geheim123', 15)
    expect(getAutoLockMinutes()).toBe(15)
    setAutoLockMinutes(1)
    expect(getAutoLockMinutes()).toBe(1)
  })

  it('läuft nach Ablauf des Fensters automatisch in „gesperrt"', async () => {
    await setPassphrase('geheim123', 5)
    // Fenster künstlich in die Vergangenheit setzen.
    ;(globalThis as unknown as { sessionStorage: MemStorage }).sessionStorage.setItem(
      'bh_unlocked_until_v1',
      String(Date.now() - 1000),
    )
    expect(isUnlocked()).toBe(false)
    // Erneutes Entsperren stellt den Zugriff wieder her.
    markUnlocked()
    expect(isUnlocked()).toBe(true)
  })
})
