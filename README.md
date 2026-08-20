# Streamly — Live Video Social

A live-streaming social app prototype: discover streams, watch/broadcast/group video rooms with chat & gifts, a photo/reels feed, stories, DMs, and notifications — all in React 19 + Vite + Tailwind CSS 4.

> **Status:** Phase 0 (professional foundations) complete — see [ROADMAP.md](./ROADMAP.md) for the plan to full production. The app currently runs on built-in demo data with simulated realtime behavior; no backend yet.

## Quickstart

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Command                           | Purpose                                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Vite dev server (0.0.0.0, any host allowed for previews)                                                  |
| `npm run build`                   | Production build (single-file HTML via vite-plugin-singlefile)                                            |
| `npm run preview`                 | Serve the production build                                                                                |
| `npm run typecheck`               | `tsc --noEmit` (strict, incl. `noUnusedLocals/Parameters`)                                                |
| `npm run lint` / `lint:fix`       | ESLint 9 flat config: TS + react-hooks + jsx-a11y                                                         |
| `npm run format` / `format:check` | Prettier write / check                                                                                    |
| `npm run test`                    | Vitest + Testing Library unit tests (`src/**/*.test.*`)                                                   |
| `npm run e2e`                     | Playwright smoke tests (`e2e/`, boots build+preview itself; needs `npx playwright install chromium` once) |

## Quality gates

- **GitHub Actions** (`.github/workflows/ci.yml`): typecheck → format:check → lint → unit tests → build, plus a Playwright e2e job, on pushes to `main` / `arena/**` and PRs.
- **Husky + lint-staged**: pre-commit runs Prettier + ESLint on staged files (`npm install` sets it up via `prepare`).

## Routing

| Route       | View                                                |
| ----------- | --------------------------------------------------- |
| `/`         | Discover (search, categories, Featured badge)       |
| `/feed`     | Feed (stories, posts, comments modal)               |
| `/messages` | Messages (DM threads, audio/video call starters)    |
| `/profile`  | Profile                                             |
| `/live/:id` | Call room — any stream id, or `broadcast` / `group` |

Deep links are refresh-safe; leaving a room returns to the previous tab.

## Environment

Copy `.env.example` → `.env`. Values are read through `src/config.ts` (single access point); unset media/API URLs are inert until later phases.

## Observability

- `src/lib/analytics.ts` — `track(event, props)` shim (dev-console logging; provider wiring comes in Phase 4). `initObservability()` activates Sentry only when `VITE_SENTRY_DSN` is set.
- `src/lib/logger.ts` — leveled structured logging wrapper.

## Project structure

```
src/
  App.tsx              # shell: header/nav/modals + route table
  config.ts            # env access
  data.ts              # demo fixtures (production import surface shrinks per phase)
  types.ts             # shared domain models (future API contract)
  lib/                 # logger, analytics
  components/          # CallRoom, PreJoin, Modal, StoriesBar, panels, …
  views/               # Discover, Feed, Messages, Profile (+ tests)
  utils/cn.ts          # clsx + tailwind-merge
e2e/smoke.spec.ts      # Playwright smoke: watch→chat→leave, routes, go-live
```

Contributing: pick items from [ROADMAP.md](./ROADMAP.md); keep PRs green through the CI gates.
