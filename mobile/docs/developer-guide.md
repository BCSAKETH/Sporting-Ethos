# Developer Guide

## Prerequisites

- Node.js 20+, npm
- For `expo run:android`: Android Studio with an SDK platform + emulator (or a physical
  Android device with USB debugging), and a JDK (17+)

## Environment variables

`mobile/.env` (gitignored — copy from `.env.example`):

```
EXPO_PUBLIC_SUPABASE_URL=https://ieurjkuvrdmmnwursvdk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Only the **publishable/anon** key ever goes here. The project's `service_role` key and
Supabase management access token (in the repo root `.env`, used by tooling only) must
never be added to this file or bundled into the app — they'd be extractable from the
compiled APK.

## Everyday commands

```bash
npx expo start          # Metro bundler; press 'a' for Android
npm run typecheck        # tsc --noEmit — run before every commit
npm run lint              # ESLint (eslint-config-expo + React Compiler rules)
npm test                  # Jest, colocated *.test.ts(x) files
npm test -- --watch       # watch mode while iterating
```

## Testing conventions

Tests are colocated next to the code they cover (`utils/health.ts` →
`utils/health.test.ts`), not in a parallel `__tests__/` tree. Coverage focuses on:

- **Pure logic** (`utils/`): BMI calculation, slot generation, QR payload parsing, queue
  sorting — these are the highest-value, most deterministic tests in the app and don't
  need any mocking.
- **Validation** (`features/*/schemas.ts`): every zod schema has a
  `describe`/`it` block covering the valid case and each rejection path.
- **Components** (`components/ui/`): a representative test on `Button` covering press
  handling and the loading/disabled state, using `@testing-library/react-native`.

`@testing-library/react-native` v14's `render()` is **async** — always `await render(...)`
before touching `screen`, or `screen.getByRole(...)` throws "render function has not
been called" (an easy mistake; see `components/ui/Button.test.tsx`).

Screen-level integration tests (full navigation + Supabase mocking) weren't added for
this pass — they'd need a fuller mocking harness for `expo-router` and `@supabase/supabase-js`
than was worth building for a hackathon-scoped demo. The service layer's thin,
single-purpose functions are what make the pure-logic tests above meaningful without
them.

## Code conventions

- **Repository pattern**: any new Supabase call goes in `services/`, never inline in a
  screen or hook.
- **Feature-first**: new business logic (a schema, a TanStack Query hook) goes under
  `features/<feature-name>/`, not `hooks/` (that's reserved for cross-feature hooks like
  `usePushNotifications`).
- **No inline styles for anything themeable** — use NativeWind `className`; reach for
  `theme/colors.ts` only when a color needs to reach non-style code (chart colors, icon
  `color` props, which NativeWind can't reach).
- Strict TypeScript throughout; avoid `any` — if a Supabase embedded-select response
  needs a shape TS can't infer, cast to the specific type in `types/models.ts`, not `any`.

## Known environment quirks worth knowing about

- `expo-linking`'s `Linking.parse()` reads `Constants.expoConfig`, which isn't populated
  outside a full Expo runtime — it throws under plain Jest. `utils/qr.ts` deliberately
  uses the global `URL` (React Native ships its own WHATWG implementation) instead, both
  for testability and to avoid that runtime dependency.
- NativeWind v4 pins to Tailwind **v3** (`tailwind.config.js`, not v4's CSS-first
  config) — installing `tailwindcss@latest` would pull v4 and break the build.
