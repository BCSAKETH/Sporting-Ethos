import { APP_SCHEME } from "../constants/config";

/** The value printed/displayed as the reception counter QR code. */
export function buildCheckinQrValue(): string {
  return `${APP_SCHEME}://checkin`;
}

/**
 * Returns true for a scanned QR string that is a Sporting Ethos check-in code.
 * Accepts any valid URL or deep-link containing 'checkin' (e.g. https://sporting-ethos-six.vercel.app/checkin).
 */
export function isCheckinQrValue(value: string): boolean {
  if (!value) return false;
  const str = value.trim().toLowerCase();

  if (
    str.includes("checkin") ||
    str.includes("sportingethos") ||
    str.endsWith("/checkin")
  ) {
    return true;
  }

  return false;
}
