# Streamly — Live Video Social

A live-streaming social app: discover streams, watch/broadcast/group video rooms with chat & gifts, a photo/reels feed, stories, DMs, and notifications — React 19 + Vite + Tailwind CSS 4 client, Fastify + SQLite API.

> **Status:** Phase 0 (foundations) and Phase 1 (backend, auth, persistence) complete — see [ROADMAP.md](./ROADMAP.md). Media is still simulated (Phase 2) and realtime delivery comes in Phase 3; everything else is real and persisted.

## Quickstart

```bash
npm install
npm run dev:all      # web (5173) + API (4000) with /api proxy — that's it
```

Open http://localhost:5173 and **“Continue with demo account”**, or register a new account.

**Demo credentials** — every seeded creator uses password `demo1234`:

| Account                                                         | Notes                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| `demo@streamly.app`                                             | The “you” persona: owns 4 VOD replays, follows 3 creators |
| `aria@streamly.app`, `kai@streamly.app`, `luna@streamly.app`, … | All 8 seed creators (handle + `@streamly.app`)            |

## Architecture

```
src/                 # React client (views/components unchanged in shape)
  lib/api.ts         # fetch wrapper: base URL, token attach, 401→refresh→retry
  lib/auth.tsx       # session provider (localStorage tokens)
  lib/hooks.ts       # TanStack Query queries+mutations (server state lives here)
  lib/queryClient.ts
server/              # Fastify 5 API (tsx; dev watches)
  db.ts              # node:sqlite connection + DDL (server/data/streamly.db, gitignored)
  repo.ts            # data-access layer — every query; swap point for Prisma/Postgres
  seed.ts            # seeds DB from src/data.ts fixtures on first boot
  app.ts             # routes + JWT auth; api.test.ts covers it (12 tests)
```

Browser → Vite **proxy** (`/api` → `127.0.0.1:4000`) → API → SQLite. Client never hardcodes backend hosts, so previews/tunnels work unchanged.

### API surface (all under `/api`, JWT required except auth+health)

| Method & path                                                     | Purpose                                                          |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` | Sessions (bcrypt + JWT access 1h/refresh 7d)                     |
| `GET /me` · `PATCH /me`                                           | Profile + follower/following/stream counts; edit name/bio/avatar |
| `GET /users` · `POST /users/:id/follow`                           | Directory (with `isFollowing`), follow toggle                    |
| `GET /streams?category=&q=`                                       | Discover list (server-side filter/search)                        |
| `GET /streams/mine`                                               | Current user's streams (Profile grid)                            |
| `GET /feed` · `POST /posts/:id/like`                              | Posts incl. viewer-aware `liked`/`authorFollowed`; like toggle   |
| `POST /posts/:id/comments` · `POST /comments/:id/like`            | Comment write/like with persistence                              |
| `GET /conversations` · `GET                                       | POST /conversations/:id/messages`                                | DMs incl. unread counters |
| `GET /notifications`                                              | Notification feed                                                |

Store swap: Postgres/Prisma support is a single-file change (`server/repo.ts`) — see ROADMAP.md.

## Scripts

| Command                     | Purpose                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`               | Vite only (needs API separately)                                                       |
| `npm run dev:server`        | Fastify API on :4000 (tsx watch)                                                       |
| **`npm run dev:all`**       | **Web + API together**                                                                 |
| `npm run build` / `preview` | Single-file production build / serve                                                   |
| `npm run typecheck`         | tsc strict — client **and** server                                                     |
| `npm run lint` / `format`   | ESLint 9 (TS, react-hooks, jsx-a11y) / Prettier                                        |
| `npm run test`              | Client unit tests (16: cn, Discover, Feed)                                             |
| `npm run test:server`       | API integration tests (12, in-memory DB)                                               |
| `npm run test:all`          | Both suites                                                                            |
| `npm run e2e`               | Playwright smoke (boots API + built app; needs `npx playwright install chromium` once) |

## Quality gates

- **GitHub Actions** (`.github/workflows/ci.yml`): typecheck → format:check → lint → client tests → server tests → build, plus Playwright e2e.
- **Husky + lint-staged**: pre-commit Prettier + ESLint on staged files.

## Routing

| Route       | View                                                |
| ----------- | --------------------------------------------------- |
| `/`         | Discover (search, categories, Featured badge)       |
| `/feed`     | Feed (stories, posts, comments modal)               |
| `/messages` | Messages (DM threads, audio/video call starters)    |
| `/profile`  | Profile (real stats, edit, logout)                  |
| `/live/:id` | Call room — any stream id, or `broadcast` / `group` |

Unauthenticated visits land on the auth screen; tokens persist in `localStorage`.

## Environment

Copy `.env.example` → `.env`. Server-side vars: `STREAMLY_DB` (default `server/data/streamly.db`), `STREAMLY_JWT_SECRET`, `PORT`, `HOST`, `LOG_LEVEL`. Client vars are read through `src/config.ts`.

## Observability

- `src/lib/analytics.ts` — `track(event, props)` shim; Sentry activates with `VITE_SENTRY_DSN`.
- `src/lib/logger.ts` — leveled structured logging wrapper; server logs API-side warnings at `warn` (tune with `LOG_LEVEL`).

## Simulated until later phases (explicitly)

- Call-room video is still a placeholder render (Phase 2 wires real media).
- The incoming-call timer, in-room chat bots, and DM canned replies remain client-side simulations (Phase 3 replaces with realtime).

Contributing: pick items from [ROADMAP.md](./ROADMAP.md); keep PRs green through the CI gates.
