# Deployment Guide

## Local development

```bash
npm install
cp .env.example .env        # fill in EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo start
```

Camera QR scanning and push notifications need a **development build**, not Expo Go
(Expo Go on Android can't receive remote push as of SDK 53+, and a custom native module
set like ours generally needs one anyway):

```bash
npx expo run:android        # builds and installs a debug dev-client on a connected
                             # device/emulator; requires Android Studio + an SDK/emulator
                             # installed locally
```

## One-time manual setup (accounts I can't create for you)

1. **Expo/EAS account** — `npx expo login`, then `eas init` from `mobile/` to link this
   project to an EAS project. This writes `extra.eas.projectId` into your local Expo
   config; without it, push-notification registration silently no-ops (see
   `hooks/usePushNotifications.ts`) rather than crashing.
2. **Supabase Auth redirect URL** — the "Reset Password" email flow
   (`app/reset-password.tsx`) needs `sportingethos://reset-password` (and, if you add a
   web/universal link later, its https equivalent) added to **Authentication → URL
   Configuration → Redirect URLs** in the Supabase dashboard for project
   `ieurjkuvrdmmnwursvdk`. This can't be done via SQL/migrations — it's an Auth service
   setting, not a database change.
3. **Google Play Console** (only needed to actually publish) — a $25 one-time developer
   registration, out of scope for this pass since the ask was a working demo, not a
   store submission.

## EAS builds

`eas.json` defines three profiles:

```bash
eas build --platform android --profile development   # dev client APK, for iterating
eas build --platform android --profile preview        # shareable APK, no Play Store needed
eas build --platform android --profile production      # AAB, ready for Play Console upload
```

`preview` is the fastest way to hand someone an installable APK for a demo — no Play
Store account needed on either side.

## Assets

Two scripts regenerate the brand assets checked into `assets/`:

```bash
npm run generate:brand-assets   # app icon, adaptive icon layers, monochrome, splash, notification icon
npm run generate:qr             # printable "scan to check in" reception counter QR (assets/counter-qr/counter-qr.png)
```

Both are idempotent — re-run `generate:brand-assets` after changing the brand mark in
`scripts/generate-brand-assets.mjs`. There's one counter QR for the one hospital; print
it once and post it at reception.

## Android version bumps

`app.json`'s `android.versionCode` is manual; `eas.json`'s `production` profile has
`autoIncrement: true` so EAS bumps it automatically on each production build — you
generally shouldn't need to hand-edit `versionCode`.

## What "production-ready" means here vs. what's left

Configured and working: adaptive icon (with Android 13+ monochrome variant), splash
screen, notification icon/channel, camera + notification permissions via config
plugins, `minSdkVersion 29` (Android 10+), deep linking via the `sportingethos://`
scheme, EAS build profiles for all three distribution types. **Not done** (genuinely out
of scope for a demo, not silently skipped): Play Store listing metadata (screenshots,
description, content rating), production signing key management beyond EAS's default
managed credentials, and store submission itself (`eas submit`).
