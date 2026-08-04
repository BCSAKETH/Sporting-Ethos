#!/usr/bin/env node
// Generates the printable "scan to check in" QR code for the reception
// counter. One hospital, one counter QR — the mobile app's /scan screen
// (expo-camera) just checks the scanned value matches this deep link, see
// utils/qr.ts.
//
// Usage: node scripts/generate-counter-qr.mjs

import { mkdir } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

const CHECKIN_URL = "sportingethos://checkin";
const OUT_DIR = path.resolve(process.cwd(), "assets/counter-qr");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, "counter-qr.png");
  await QRCode.toFile(outFile, CHECKIN_URL, { width: 1024, margin: 2 });
  console.log(`✔ ${outFile}\n  ${CHECKIN_URL}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
