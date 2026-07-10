// AES-GCM Ver-/Entschlüsselung über die Web Crypto API.
// Verwendet für: (1) lokalen Anthropic-API-Key, (2) verschlüsselte Backups.
// Der Schlüssel wird per PBKDF2 aus einer Passphrase abgeleitet.

const enc = new TextEncoder()
const dec = new TextDecoder()

const PBKDF2_ITERATIONS = 210_000

function toBase64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Verschlüsselt Klartext mit einer Passphrase. Ausgabeformat (base64):
 * `v1.<salt>.<iv>.<ciphertext>`.
 */
export async function encryptString(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, enc.encode(plaintext)),
  )
  return ['v1', toBase64(salt), toBase64(iv), toBase64(ciphertext)].join('.')
}

/** Entschlüsselt einen mit {@link encryptString} erzeugten String. */
export async function decryptString(payload: string, passphrase: string): Promise<string> {
  const parts = payload.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Ungültiges Verschlüsselungsformat')
  }
  const salt = fromBase64(parts[1])
  const iv = fromBase64(parts[2])
  const ciphertext = fromBase64(parts[3])
  const key = await deriveKey(passphrase, salt)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  )
  return dec.decode(plaintext)
}

/**
 * Geräte-Passphrase für den API-Key. Ein lokal generiertes, in localStorage
 * gehaltenes Geheimnis. Das schützt den Key vor beiläufigem Auslesen der
 * IndexedDB, ist aber kein Schutz gegen vollen Gerätezugriff (bewusst
 * einfach für eine private Single-User-App auf dem eigenen iPad).
 */
const DEVICE_SECRET_KEY = 'bh_device_secret_v1'

export function getDeviceSecret(): string {
  let secret = localStorage.getItem(DEVICE_SECRET_KEY)
  if (!secret) {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    secret = toBase64(bytes)
    localStorage.setItem(DEVICE_SECRET_KEY, secret)
  }
  return secret
}
