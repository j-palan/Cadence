import 'server-only'

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

/**
 * Envelope encryption for user-supplied API keys.
 *
 * A user's key is a bearer credential for their billing account, so it is never
 * stored in the clear and never sent back to the browser — the UI only ever
 * receives the last four characters.
 *
 * AES-256-GCM, random 12-byte IV per record, and the auth tag stored alongside,
 * so tampering fails closed rather than decrypting to garbage.
 */
const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12

function encryptionKey(): Buffer {
  // A dedicated secret is preferred. Falling back to AUTH_SECRET keeps the
  // feature working without extra setup, at the cost of coupling: rotating
  // AUTH_SECRET then makes stored keys undecryptable (users re-enter them).
  const material = process.env.BYOK_ENCRYPTION_KEY ?? process.env.AUTH_SECRET

  if (!material) {
    throw new Error('BYOK_ENCRYPTION_KEY or AUTH_SECRET must be set to store API keys.')
  }

  // HKDF gives a uniform 32-byte key from whatever length the secret happens to
  // be, and domain-separates it from any other use of the same secret.
  return Buffer.from(hkdfSync('sha256', material, 'cadence-byok-v1', 'api-key-encryption', 32))
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  // iv.tag.ciphertext, base64url so it is safe in any column or log-free path.
  return [iv, tag, ciphertext].map((b) => b.toString('base64url')).join('.')
}

export function decryptSecret(stored: string): string {
  const [ivPart, tagPart, dataPart] = stored.split('.')
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error('Stored API key is malformed.')
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(ivPart, 'base64url'),
  )
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))

  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

/** The only part of a key that may ever reach the client. */
export function keyHint(plaintext: string): string {
  return plaintext.trim().slice(-4)
}
