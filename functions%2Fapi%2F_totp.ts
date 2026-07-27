// TOTP (RFC 6238) implementation using Web Crypto.
// No external deps — works in the Workers runtime.
//
// Algorithm: HMAC-SHA1 over (secret || counter), 30-second time step, 6 digits.
// Secret is base32-encoded, as is conventional for authenticator apps.

// ---- base32 ----
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

export function base32Decode(b32: string): Uint8Array {
  const clean = b32.replace(/[\s=]/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const output: number[] = []
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(output)
}

export function generateTotpSecret(): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return base32Encode(bytes)
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  return crypto.subtle.sign('HMAC', cryptoKey, message as BufferSource)
}

/** Generate a 6-digit TOTP code for the given unix timestamp. */
export async function generateTotp(
  secretBase32: string,
  timestampMs: number = Date.now()
): Promise<string> {
  const key = base32Decode(secretBase32)
  const counter = Math.floor(timestampMs / 1000 / 30)
  const counterBytes = new Uint8Array(8)
  // 64-bit big-endian
  let v = counter
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = v & 0xff
    // JS bitwise ops are 32-bit; for counters > 2^32 we'd need BigInt.
    // 30s steps since 1970 — won't overflow 32 bits until ~ year 2106.
    v = Math.floor(v / 256)
  }
  const mac = new Uint8Array(await hmacSha1(key, counterBytes))
  const offset = mac[mac.length - 1] & 0x0f
  const binary =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff)
  const code = binary % 1_000_000
  return code.toString().padStart(6, '0')
}

/**
 * Verify a TOTP code, allowing ±1 time step (i.e. ±30s skew).
 * Constant-time-ish comparison.
 */
export async function verifyTotp(
  secretBase32: string,
  submittedCode: string,
  timestampMs: number = Date.now()
): Promise<boolean> {
  if (!/^\d{6}$/.test(submittedCode)) return false
  for (let skew = -1; skew <= 1; skew++) {
    const expected = await generateTotp(secretBase32, timestampMs + skew * 30_000)
    if (expected.length !== submittedCode.length) continue
    let diff = 0
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ submittedCode.charCodeAt(i)
    }
    if (diff === 0) return true
  }
  return false
}

/** Build an otpauth:// URL for QR code scanning. */
export function buildOtpAuthUrl(opts: {
  issuer: string
  accountName: string
  secret: string
}): string {
  const label = `${encodeURIComponent(opts.issuer)}:${encodeURIComponent(opts.accountName)}`
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer: opts.issuer,
    digits: '6',
    period: '30',
    algorithm: 'SHA1',
  })
  return `otpauth://totp/${label}?${params.toString()}`
}
