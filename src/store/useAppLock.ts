import { useCallback, useEffect, useState } from 'react'
import {
  LOCK_CHANGED_EVENT,
  isLockEnabled,
  isUnlocked,
  markUnlocked,
  refreshUnlock,
} from '../lib/applock'

export interface AppLockState {
  /** Ist ein App-Passwort gesetzt? */
  enabled: boolean
  /** Muss der Nutzer gerade entsperren? */
  locked: boolean
  /** Nach erfolgreicher Passwortprüfung aufrufen. */
  unlock: () => void
}

/**
 * Verwaltet den Sperr-Zustand der App: initialer Sperr-Check, Auto-Sperre nach
 * Inaktivität und Erneuerung des Entsperr-Fensters bei Nutzer-Aktivität.
 */
export function useAppLock(): AppLockState {
  const [enabled, setEnabled] = useState(() => isLockEnabled())
  const [locked, setLocked] = useState(() => isLockEnabled() && !isUnlocked())

  const recheck = useCallback(() => {
    const en = isLockEnabled()
    setEnabled(en)
    setLocked(en && !isUnlocked())
  }, [])

  useEffect(() => {
    // Regelmäßig prüfen, ob das Entsperr-Fenster abgelaufen ist (Auto-Sperre).
    const interval = window.setInterval(recheck, 15_000)

    // Aktivität verlängert das Entsperr-Fenster.
    const onActivity = () => refreshUnlock()
    window.addEventListener('pointerdown', onActivity, { passive: true })
    window.addEventListener('keydown', onActivity)

    // Rückkehr zur App (Tab wieder sichtbar) sofort prüfen.
    document.addEventListener('visibilitychange', recheck)
    // Änderungen an der Sperre (Passwort gesetzt/entfernt, „jetzt sperren").
    window.addEventListener(LOCK_CHANGED_EVENT, recheck)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener('keydown', onActivity)
      document.removeEventListener('visibilitychange', recheck)
      window.removeEventListener(LOCK_CHANGED_EVENT, recheck)
    }
  }, [recheck])

  const unlock = useCallback(() => {
    markUnlocked()
    setEnabled(isLockEnabled())
    setLocked(false)
  }, [])

  return { enabled, locked, unlock }
}
