# Streamly — Live Video Social

A live-streaming social app prototype: discover streams, watch/broadcast/group video rooms with chat & gifts, a photo/reels feed, stories, DMs, and notifications — all in React 19 + Vite + Tailwind CSS 4.

> **Status:** Foundations and persistence are functional; media and realtime work are underway — see [ROADMAP.md](./ROADMAP.md). Public browsing and authenticated social actions use Fastify/TanStack Query. Browser tracks can publish through LiveKit, while Socket.IO now synchronizes persisted room chat, reactions, and viewer presence. Every service layer remains feature-flagged with fixture fallbacks.

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

Copy `.env.example` → `.env`. Server values configure SQLite, CORS, auth secrets, and optional LiveKit credentials; client values come through `src/config.ts`. Enable persistence with `VITE_ENABLE_API`, browser tracks with `VITE_ENABLE_MEDIA`, realtime rooms with `VITE_ENABLE_REALTIME`, and set `VITE_LIVEKIT_URL=wss://…` to connect an SFU. Blank realtime origin uses the same host through Vite's WebSocket proxy, so browser code never calls localhost directly.

The HTTP API includes:

- `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, and `/live/token`
- `GET /health`, `/me`, `/me/stats`, `/me/followers`, `/users/:handle`, `/streams`, `/streams/:id`, `/feed`, `/conversations`, and `/conversations/:id/messages`
- `PATCH /me` for persisted name, handle, and avatar URL edits
- `POST /streams` creates a unique live broadcast; `PATCH /streams/:id/end` marks it replayable
- `POST /posts/:id/comments`, `/posts/:id/like`, `/follows/:userId`, and `/conversations/:id/messages`
- `DELETE /posts/:id/like` and `/follows/:userId`

Socket.IO exposes `room.join`, `chat.send`, `reaction.send`, and `gift.send`; isolated `stream:{id}` channels emit persistent chat, reactions, gift animations, join/leave events, presence counts, and room errors. Gift events are recorded against the server's gift catalog for future wallet settlement.

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
