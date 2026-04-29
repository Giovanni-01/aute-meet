import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12
const TAG_BYTES = 16
const KEY_HEX_LENGTH = 64 // 32 bytes × 2 hex chars

/**
 * Lazily validated key accessor.
 * Throws a descriptive error on first use if the env var is missing or malformed,
 * rather than at module load time (which would break `pnpm build` without the var).
 */
function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error(
      `ENCRYPTION_KEY must be a ${KEY_HEX_LENGTH}-character hex string (32 bytes). ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    )
  }
  return Buffer.from(hex, "hex")
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * Each call produces a different output because the IV is randomly generated.
 * Returns a colon-separated base64 string: `<iv>:<ciphertext>:<authTag>`
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag() // always TAG_BYTES long for GCM
  return [
    iv.toString("base64"),
    encrypted.toString("base64"),
    authTag.toString("base64"),
  ].join(":")
}

/**
 * Decrypts a payload produced by `encrypt`.
 * Throws if the payload is malformed or the GCM authentication tag is invalid
 * (i.e. the ciphertext was tampered with).
 */
export function decrypt(payload: string): string {
  const key = getKey()
  const parts = payload.split(":")
  if (parts.length !== 3) {
    throw new Error(
      "Invalid encrypted payload: expected format `iv:ciphertext:authTag` (base64 parts separated by colons)"
    )
  }
  const [ivB64, ciphertextB64, tagB64] = parts
  const iv = Buffer.from(ivB64, "base64")
  const ciphertext = Buffer.from(ciphertextB64, "base64")
  const authTag = Buffer.from(tagB64, "base64")

  if (authTag.length !== TAG_BYTES) {
    throw new Error(`Invalid authTag length: expected ${TAG_BYTES} bytes`)
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8")
}

/**
 * Constant-time comparison of two strings to prevent timing attacks.
 * Returns false for strings of different length without early-exit leakage.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
