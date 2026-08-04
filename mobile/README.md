# Sporting Ethos — Mobile (Android)

The patient-facing Android app for Sporting Ethos, built with **Expo (React Native) +
TypeScript**, sharing the same Supabase backend as the web app in the repo root.

## Stack

React Native · Expo SDK 57 · TypeScript (strict) · Expo Router · Supabase
(Auth + Postgres + Realtime) · TanStack Query · Zustand · React Hook Form + Zod ·
NativeWind (Tailwind for RN) · Reanimated · Lucide icons · Expo Camera (QR) ·
Expo Notifications · Expo Secure Store.

## What's here vs. what's next

This is a hackathon-scoped build: a real, working slice of the full spec rather than a
shallow scaffold of every module. Built: authentication, patient profile (with BMI,
allergies, conditions), Hospital → Department → Doctor → Slot → Appointment booking,
My Appointments, a doctor directory with search, in-app notifications, and QR-based
walk-in check-in. **Deferred** (schema is normalized so these attach later without
touching what exists): doctor/admin portals, prescriptions, lab orders, medicine
ordering, reports/PDF viewer, insurance, telemedicine. See
[`docs/architecture.md`](docs/architecture.md) for the reasoning.

## Quick start

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + publishable key
npx expo start
```

Press `a` to open on an Android emulator, or scan the QR with Expo Go / a dev build on
a physical device. Camera-based QR check-in and push notifications require a
[development build](docs/deployment-guide.md) — they don't work in Expo Go.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run android` | Start Metro and open on a connected Android device/emulator |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Jest (unit + component tests) |
| `npm run generate:qr` | Regenerate the printable reception counter QR codes |
| `npm run generate:brand-assets` | Regenerate the app icon / splash / notification icon PNGs |

## Docs

- [Architecture](docs/architecture.md) — layering, navigation, auth flow, state strategy
- [Database](docs/database.md) — schema, ER diagram, RLS model
- [Migrations](docs/migrations.md) — how the schema evolved and how to add more
- [API / Services](docs/api-services.md) — the data-access layer, function by function
- [Deployment Guide](docs/deployment-guide.md) — `expo run:android`, EAS builds, Play Store readiness
- [Developer Guide](docs/developer-guide.md) — local setup, env vars, testing, conventions
- [Folder Structure](docs/folder-structure.md) — what lives where and why
