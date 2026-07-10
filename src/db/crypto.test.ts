import { describe, expect, it } from 'vitest'
import { decryptString, encryptString } from './crypto'

describe('encryptString / decryptString', () => {
  it('verschlüsselt und entschlüsselt verlustfrei (Roundtrip)', async () => {
    const secret = 'sk-ant-test-12345 äöü €'
    const payload = await encryptString(secret, 'passwort')
    expect(payload.startsWith('v1.')).toBe(true)
    expect(payload).not.toContain(secret)
    const back = await decryptString(payload, 'passwort')
    expect(back).toBe(secret)
  })

  it('scheitert bei falscher Passphrase', async () => {
    const payload = await encryptString('geheim', 'richtig')
    await expect(decryptString(payload, 'falsch')).rejects.toBeTruthy()
  })

  it('lehnt ungültiges Format ab', async () => {
    await expect(decryptString('kaputt', 'x')).rejects.toThrow()
  })
})
