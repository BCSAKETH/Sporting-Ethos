import { APP_SCHEME } from "../constants/config";

/** The value printed/displayed as the reception counter QR code (see scripts/generate-counter-qr.mjs). */
export function buildCheckinQrValue(): string {
  return `${APP_SCHEME}://checkin`;
}

/**
 * Returns true for a scanned QR string that is a Sporting Ethos check-in
 * code. Accepts two formats:
 *  1. Deep-link:  sportingethos://checkin
 *  2. HTTPS URL:  https://<any-host>/checkin  (the format the reception dashboard prints)
 *
 * Uses the global `URL` (React Native ships its own WHATWG implementation)
 * directly rather than `expo-linking`'s `parse()`, which reads
 * `Constants.expoConfig` and throws outside a full Expo runtime.
 */
export function isCheckinQrValue(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    const scheme = url.protocol.replace(/:$/, "");

    // 1. Deep-link scheme: sportingethos://checkin
    if (scheme === APP_SCHEME) {
      return (
        url.hostname === "checkin" ||
        url.pathname.replace(/^\//, "") === "checkin"
      );
    }

    // 2. HTTPS / HTTP URL whose pathname is /checkin (reception dashboard QR)
    if (scheme === "https" || scheme === "http") {
      return url.pathname.replace(/\/$/, "") === "/checkin";
    }

    return false;
  } catch {
    return false;
  }
}
