#!/usr/bin/env node
// Rasterizes the Sporting Ethos brand mark (same shapes as components/Logo.tsx
// and the web app's src/components/Logo.jsx) into every PNG asset app.json
// references: app icon, Android adaptive icon layers, monochrome (Android
// 13+ themed icon), splash icon, notification icon, and web favicon.
//
// Usage: node scripts/generate-brand-assets.mjs

import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.resolve(process.cwd(), "assets/images");

const EMERALD_900 = "#065f46";
const EMERALD_500 = "#10b981";
const EMERALD_50 = "#ecfdf5";

// `scale` controls how much of the canvas the mark occupies — kept well
// inside Android's adaptive-icon safe zone (~66% of the canvas) so it
// survives circle/squircle/rounded-square masking on different launchers.
function markSvg({ size, scale = 0.62, background = "none", strokeColor = EMERALD_500, dotColor = EMERALD_50, bgSquareColor = null }) {
  const inner = size * scale;
  const offset = (size - inner) / 2;
  const r = inner * 0.25; // corner radius, proportional to the 40x40 source mark (rx=10 of 40)

  const bgRect = bgSquareColor
    ? `<rect x="${offset}" y="${offset}" width="${inner}" height="${inner}" rx="${r}" fill="${bgSquareColor}" />`
    : "";

  // Paths below are the original 40x40 mark scaled/translated into the inner box.
  const s = inner / 40;
  const tx = offset;
  const ty = offset;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${background}" />
  ${bgRect}
  <g transform="translate(${tx} ${ty}) scale(${s})">
    <path d="M11 24c3.5 3.2 14.5 3.2 18 0M13 16c2.5-2.4 11.5-2.4 14 0" stroke="${strokeColor}" stroke-width="2.4" stroke-linecap="round" fill="none" />
    <circle cx="20" cy="20" r="3.4" fill="${dotColor}" />
  </g>
</svg>`;
}

async function renderPng(svg, outFile, { width, height } = {}) {
  let pipeline = sharp(Buffer.from(svg));
  if (width && height) pipeline = pipeline.resize(width, height);
  await pipeline.png().toFile(outFile);
  console.log(`✔ ${outFile}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Full app icon (opaque emerald background + mark) — used as the fallback
  // icon, iOS icon, and favicon source.
  const icon = markSvg({ size: 1024, scale: 0.72, bgSquareColor: EMERALD_900 });
  await renderPng(icon, path.join(OUT_DIR, "icon.png"));

  // Android adaptive icon: separate foreground (mark only, transparent) and
  // background (solid brand color) layers, composited by the OS.
  const adaptiveForeground = markSvg({ size: 1024, scale: 0.62, background: "none" });
  await renderPng(adaptiveForeground, path.join(OUT_DIR, "android-icon-foreground.png"));

  const adaptiveBackground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${EMERALD_900}" /></svg>`;
  await renderPng(adaptiveBackground, path.join(OUT_DIR, "android-icon-background.png"));

  // Android 13+ monochrome/themed icon: single-color silhouette, transparent bg.
  const monochrome = markSvg({ size: 1024, scale: 0.62, background: "none", strokeColor: "#ffffff", dotColor: "#ffffff" });
  await renderPng(monochrome, path.join(OUT_DIR, "android-icon-monochrome.png"));

  // Splash icon: shown centered over a white background (see app.json's
  // expo-splash-screen plugin config), so render the colored mark only.
  const splash = markSvg({ size: 512, scale: 0.8, background: "none" });
  await renderPng(splash, path.join(OUT_DIR, "splash-icon.png"));

  // Notification icon: Android requires a flat white silhouette on transparent.
  const notification = markSvg({ size: 256, scale: 0.85, background: "none", strokeColor: "#ffffff", dotColor: "#ffffff" });
  await renderPng(notification, path.join(OUT_DIR, "notification-icon.png"), { width: 96, height: 96 });

  // Web favicon.
  await renderPng(icon, path.join(OUT_DIR, "favicon.png"), { width: 48, height: 48 });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
