# Folder Structure

```
mobile/
├── app/                      Expo Router routes (file-based navigation)
│   ├── (auth)/               login, signup, forgot-password — unauthenticated stack
│   ├── (tabs)/                index (dashboard), departments, doctors, appointments, profile
│   ├── doctor/[id].tsx        Doctor profile detail
│   ├── booking/[doctorId].tsx Date → slot → reason → confirm
│   ├── scan.tsx               QR camera scanner (spot check-in)
│   ├── notifications.tsx      Notification list
│   ├── reset-password.tsx     Deep-link target from the password-reset email
│   └── _layout.tsx            Providers + auth-gated Stack.Protected routing
│
├── features/                 Business logic, one folder per domain
│   ├── auth/                  schemas.ts (zod) + useAuth.ts (TanStack Query hooks)
│   ├── profile/                schemas.ts + useProfile.ts
│   ├── booking/                 schemas.ts
│   ├── hospitals/ departments/ doctors/ appointments/  useX.ts hooks
│   ├── notifications/          useNotifications.ts
│   └── qr-checkin/              useCheckin.ts
│
├── services/                 Repository layer — every supabase.from(...) call lives here
├── lib/                       supabase client, TanStack Query client, dev-only logger
├── store/                     Zustand: authStore, uiStore
├── providers/                 AuthProvider (wraps app/_layout.tsx)
├── storage/                   LargeSecureStore (encrypted session persistence)
├── theme/                     colors.ts — mirrored in tailwind.config.js
├── constants/                 config.ts, queryKeys.ts
├── types/                     database.ts (generated), models.ts (ergonomic aliases)
├── utils/                     Pure functions: health.ts, slots.ts, qr.ts, queue.ts, icons.ts
├── hooks/                     Cross-feature hooks (usePushNotifications.ts)
├── components/
│   ├── ui/                    Presentational primitives: Button, Card, TextField, ...
│   ├── Logo.tsx, NotificationBell.tsx
├── assets/
│   ├── images/                 App icon, adaptive icon layers, splash, notification icon
│   └── counter-qr/              Printable reception QR codes (generated, gitignored output)
├── scripts/                    generate-brand-assets.mjs, generate-counter-qr.mjs
├── docs/                       You are here
├── app.json, eas.json          Expo config, EAS build profiles
├── babel.config.js, metro.config.js, tailwind.config.js, global.css   NativeWind wiring
└── .env / .env.example         EXPO_PUBLIC_* Supabase config (publishable key only)
```

## Why this split

- `app/` stays thin on purpose — every screen is layout + a couple of hooks + JSX, so
  navigation structure changes don't ripple into business logic.
- `features/` vs `services/` mirrors a repository pattern: `services/` is the only layer
  that knows Supabase exists; `features/` is the only layer that knows TanStack Query
  exists. A screen imports from `features/`, never straight from `services/` or
  `lib/supabase`.
- `utils/` has zero imports from `lib/`, `services/`, or React — that's what lets
  `utils/*.test.ts` run instantly with no mocking, and it's deliberately kept that way
  (see `utils/queue.ts`, extracted out of `services/checkins.service.ts` specifically so
  the queue-ordering logic could be unit-tested without constructing a Supabase client).
