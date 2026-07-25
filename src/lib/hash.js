// SHA-256 verification hash for the branded receipt.
// Uses the browser's built-in Web Crypto API — no dependencies.
export async function sha256Hex(input) {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Build the canonical string that a receipt's hash is computed from.
export function receiptPayload({ appointment_id, name, check_in_time, id }) {
  return `${appointment_id}|${name}|${check_in_time}|${id}`
}
