/**
 * Smoke test for the crypto module.
 *
 * Run with:
 *   ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
 *   pnpm tsx src/lib/crypto.smoke.ts
 *
 * Exits with code 0 on success, code 1 on failure.
 */

import { encrypt, decrypt } from "./crypto"

export function runCryptoSmokeTest(): void {
  const plaintext = "aute-meet-smoke-test-🔐"

  // 1. Basic round-trip
  const ciphertext = encrypt(plaintext)
  const decrypted = decrypt(ciphertext)
  if (decrypted !== plaintext) {
    throw new Error(
      `Round-trip failed: expected "${plaintext}", got "${decrypted}"`
    )
  }

  // 2. Output format — must have exactly two colons
  const parts = ciphertext.split(":")
  if (parts.length !== 3) {
    throw new Error(
      `Expected format iv:ciphertext:authTag, got ${parts.length} parts`
    )
  }

  // 3. Non-determinism — same plaintext must produce different ciphertexts each call
  const ciphertext2 = encrypt(plaintext)
  if (ciphertext === ciphertext2) {
    throw new Error("encrypt() produced identical output for two separate calls — IV is not random")
  }

  // 4. Tamper detection — modifying ciphertext must throw
  const [iv, ct, tag] = ciphertext.split(":")
  const tampered = [iv, ct.slice(0, -2) + "AA", tag].join(":")
  let threw = false
  try {
    decrypt(tampered)
  } catch {
    threw = true
  }
  if (!threw) {
    throw new Error("decrypt() did not throw on tampered ciphertext — GCM auth check failed")
  }

  console.log("✓ Round-trip encrypt/decrypt")
  console.log("✓ Output format iv:ciphertext:authTag")
  console.log("✓ Non-deterministic output (random IV)")
  console.log("✓ Tamper detection (GCM auth tag)")
  console.log("\nAll crypto smoke tests passed.")
}

// Run when executed directly
runCryptoSmokeTest()
