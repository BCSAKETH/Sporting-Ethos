import { APP_SCHEME } from "../constants/config";

/** The value printed/displayed as the reception counter QR code. */
export function buildCheckinQrValue(): string {
  return `${APP_SCHEME}://checkin`;
}

/**
 * Accepts any non-empty scanned QR code value as a valid check-in code.
 */
export function isCheckinQrValue(value: string): boolean {
  if (!value) return false;
  const str = value.trim();
  return str.length > 0;
}
