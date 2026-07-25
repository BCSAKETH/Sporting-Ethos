// Verification hash for the branded receipt.
// Uses the browser's Web Crypto SHA-256 when available (HTTPS / localhost).
// On insecure origins (e.g. a phone hitting http://192.168.x.x over Wi-Fi),
// crypto.subtle is unavailable, so we fall back to a fast non-crypto hash so
// check-in never fails.
export async function sha256Hex(input) {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
      const data = new TextEncoder().encode(input)
      const digest = await crypto.subtle.digest('SHA-256', data)
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }
  } catch {
    /* fall through to the non-crypto fallback */
  }
  return fnv1a64(input)
}

// FNV-1a based fallback (not cryptographic) — returns a 16-hex-char digest.
function fnv1a64(str) {
  let h1 = 0x811c9dc5
  let h2 = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = Math.imul(h2 ^ (c + 0x9e3779b9), 0x01000193)
  }
  const hex = (n) => (n >>> 0).toString(16).padStart(8, '0')
  return hex(h1) + hex(h2)
}

// Build the canonical string that a receipt's hash is computed from.
export function receiptPayload({ appointment_id, name, check_in_time, id }) {
  return `${appointment_id}|${name}|${check_in_time}|${id}`
}
