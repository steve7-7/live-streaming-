# Streamly — Live Video Social

A live-streaming social app prototype: discover streams, watch/broadcast/group video rooms with chat & gifts, a photo/reels feed, stories, DMs, and notifications — all in React 19 + Vite + Tailwind CSS 4.

> **Status:** Phase 0 is complete and Phase 1 is in progress — see [ROADMAP.md](./ROADMAP.md). Discover, Feed, streams, and creator profiles are public; authentication is requested only for personal pages and social actions. Fastify persistence, JWT authentication, automatic token rotation, and the typed REST/TanStack Query client are available behind `VITE_ENABLE_API`; fixture mode remains available for offline use.

## Quickstart

```bash
npm install
npm run dev          # client: http://localhost:5173
npm run dev:api      # API: http://localhost:4000 (run in a second terminal)
```

The API applies `server/migrations/001_init.sql` and seeds demo content on its first start. Its default demo login is `demo@streamly.local` / `streamly-demo`. Data is stored in ignored `data/streamly.db`; set `SEED_DEMO_DATA=false` outside local development.

## Scripts

| Command                           | Purpose                                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Vite client (0.0.0.0, preview-safe; proxies `/api` to port 4000)                                          |
| `npm run dev:api` / `start:api`   | Fastify API in watch/one-shot mode                                                                        |
| `npm run db:seed`                 | Seed the local database when it is empty                                                                  |
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

| Route        | View                                                |
| ------------ | --------------------------------------------------- |
| `/`          | Discover (search, categories, Featured badge)       |
| `/feed`      | Feed (stories, posts, comments modal)               |
| `/messages`  | Messages (DM threads, audio/video call starters)    |
| `/profile`   | Your editable profile (sign-in required)            |
| `/u/:handle` | Public, shareable creator profile                   |
| `/login`     | Sign in/sign up; returns to the requested page      |
| `/live/:id`  | Call room — any stream id, or `broadcast` / `group` |

Deep links are refresh-safe; leaving a room returns to the previous tab.

## Environment

Copy `.env.example` → `.env`. Server values configure the SQLite database, API port, CORS origin, and separate access/refresh JWT secrets. Client values are read through `src/config.ts`. Fixture mode is the default; set `VITE_ENABLE_API=true` to activate the Phase 1 REST client. `VITE_API_URL=/api` uses Vite's proxy, so browser code never calls localhost directly. It currently consumes:

- `POST /auth/register`, `/auth/login`, `/auth/refresh`, and `/auth/logout`
- `GET /health`, `/me`, `/me/stats`, `/me/followers`, `/users/:handle`, `/streams`, `/streams/:id`, `/feed`, `/conversations`, and `/conversations/:id/messages`
- `PATCH /me` for persisted name, handle, and avatar URL edits
- `POST /posts/:id/comments`, `/posts/:id/like`, `/follows/:userId`, and `/conversations/:id/messages`
- `DELETE /posts/:id/like` and `/follows/:userId`

Access and refresh tokens are stored under the `streamly_*_token` local-storage keys. The client restores sessions at startup and, after a 401, performs one shared refresh rotation before retrying concurrent requests. Failed refreshes clear the session and return to sign-in. Requests also have configurable timeouts and typed errors.

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
