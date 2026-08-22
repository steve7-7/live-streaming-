# Streamly — Production Roadmap

**Goal:** evolve the current Streamly prototype into a real, professional product **without changing its structure, features, or functionality**. Every screen, component, and interaction that exists today stays — we replace the _simulated layers_ (mock data, fake timers, no-op buttons) with _real services_ underneath, one layer at a time.

---

## 1. Current state (baseline)

Fully working UI, all client-side, zero backend:

| Layer                   | Today                      | Simulated by                                                                                |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| Data                    | Static fixtures            | `src/data.ts` (picsum/pravatar URLs)                                                        |
| Live video              | Gradient placeholder tiles | `CallRoom` renders colored boxes, `PreJoin` shows a color block instead of a camera preview |
| Chat                    | Bots on a timer            | `chatBots` + `setInterval` in `CallRoom`                                                    |
| Reactions / gifts       | Local state only           | `FloatingReactions`, gift toasts                                                            |
| Incoming call           | Fires once after 14 s      | `setTimeout` in `App.tsx`                                                                   |
| Viewer counts / elapsed | Random walk + timer        | `useEffect` intervals in `CallRoom`                                                         |
| Auth / identity         | Hardcoded `me` user        | `data.ts`                                                                                   |
| Navigation              | `useState` tab switch      | no URLs/refresh-safe routes                                                                 |
| Persistence             | None                       | state resets on reload                                                                      |
| Theming                 | Dark mode                  | not persisted                                                                               |

**Asset inventory (all preserved):** 4 views (`Discover`, `Feed`, `Messages`, `Profile`), 10 components (`App` shell+nav, `CallRoom`, `PreJoin`, `IncomingCall`, `InviteModal`, `NotificationsPanel`, `SettingsPanel`, `StoriesBar`, `Modal`, `Avatar`, `Icon`), typed models in `types.ts`, utility `cn`.

---

## 2. Guiding principles

1. **UI is frozen.** Components keep their props, views keep their callbacks. Changes happen _behind_ the props.
2. **`types.ts` becomes the API contract.** The existing `User`, `Stream`, `ChatMessage`, `Conversation`, `DirectMessage`, `FeedPost`, `FeedComment`, `Reaction` interfaces map 1:1 to API DTOs — share them between client and server.
3. **Swap layers, not screens.** `data.ts` → API client + cache; timers → WebSocket events; color tiles → real video tracks.
4. **Incremental & shippable.** Each phase ends in a deployable state, never a broken in-between.
5. **Feature flags** for new behavior (`REACT_APP/ VITE_` env toggles) so the demo keeps working during migration.

---

## 3. Target architecture

```
┌────────────────────────────── Client (this repo) ──────────────────────────────┐
│ React 19 + Vite + Tailwind  (components/views UNCHANGED)                       │
│ React Router · TanStack Query · Zustand · LiveKit SDK · API client             │
└───────────────┬──────────────────────┬───────────────────────┬─────────────────┘
             HTTPS/REST             WebSocket (WS)           WebRTC
                │                      │                       │
┌───────────────▼───────────┐ ┌────────▼─────────┐ ┌───────────▼─────────────┐
│ API service               │ │ Realtime service │ │ Media SFU               │
│ (NestJS/Fastify + Prisma) │ │ (Socket.IO/uWS)  │ │ (LiveKit Cloud/selfhost)│
│ PostgreSQL · Redis · S3   │ │ presence, chat,  │ │ rooms, tracks, egress,  │
└───────────────────────────┘ │ calls, notifs    │ │ RTMP out, recording     │
                              └──────────────────┘ └─────────────────────────┘
```

---

## 4. Phase plan

### Phase 0 — Professional foundations _(~1 week, no user-visible change)_

> **✅ DONE — 2026-08-20.** Router behind the existing tabs (`/`, `/feed`, `/messages`, `/profile`, `/live/:id` incl. `broadcast`/`group` — `/u/:handle` lands in Phase 1 with multi-user profiles); `.env` + `src/config.ts`; ESLint 9 flat (TS + react-hooks + jsx-a11y) + Prettier + Husky/lint-staged; GitHub Actions CI (quality job + Playwright job); Vitest/RTL suite (15 tests: `cn`, Discover filters/Featured badge, Feed likes/comments/follow) + Playwright smoke spec; Sentry/logger/analytics shims; dark-mode persistence. Small a11y wins shipped along the way (aria-labels on call controls, keyboard-friendly modal backdrops, hoisted `VideoTile`).

Make the codebase production-grade before adding services.

- **Routing:** add `react-router-dom`; map tab state → routes (`/`, `/feed`, `/messages`, `/u/:handle`, `/live/:streamId`) so links are shareable and refresh-safe. `App` keeps rendering the same `navItems`; tabs become `<NavLink>`s, `call` state becomes `/live/:id` route.
- **Config:** `.env` handling (`VITE_API_URL`, `VITE_WS_URL`, `VITE_LIVEKIT_URL`, feature flags). Remove hardcoded URLs.
- **Quality gates:** ESLint (react-hooks, a11y), Prettier, `tsc --noEmit` in CI (GitHub Actions), Husky/lint-staged pre-commit.
- **Testing baseline:** Vitest + React Testing Library for `cn`, Feed like/comment logic, Discover filters; Playwright smoke: load app, open stream, send chat.
- **Observability skeleton:** Sentry (frontend), structured logging wrapper, analytics event shim (`track("watch_stream")` — no-op until Phase 5).
- **Small fixes that preserve functionality:** persist `dark` to `localStorage`, keep-alive `<main>` views or route-level code-splitting, skeleton states reuse the new `.shimmer`.

**Exit criteria:** CI green, routes work, tests run on PRs.

### Phase 1 — Backend, auth & persistence _(~2–3 weeks)_

> **🚧 IN PROGRESS — started 2026-08-20.** The typed REST/TanStack Query client and Fastify service now provide versioned SQL migrations, local SQLite persistence, seeded development data, bcrypt credentials, short-lived JWT access tokens, rotating refresh tokens, CORS, validation, and the streams/feed/follows/comments/conversations/DM endpoints consumed by the UI. Discover is always the landing page; Discover, Feed, stream watching, and `/u/:handle` creator profiles are public, while personal pages and write actions redirect guests to `/login` and return them afterward. Startup session restoration, single-flight token refresh/retry, expiration handling, and sign-out are connected behind `VITE_ENABLE_API`. Profile edits, follower previews, statistics, follows, comments, and DMs persist. The disabled flag keeps fixture mode fully offline. PostgreSQL/managed-SQL deployment, signed media uploads, OAuth, and the remaining fixture consumers are next.

Replace `data.ts` with a real API; keep every type.

- **Stack:** NestJS or Fastify + Prisma + PostgreSQL; Redis for cache/presence; S3-compatible storage (avatars/thumbnails/post media). Alternative low-ops path: **Supabase** (auth + Postgres + storage + realtime) to move faster.
- **Schema (mirrors `types.ts`):** `users`, `streams` (title, category, status live/vod, started_at), `follows`, `conversations`, `direct_messages`, `feed_posts`, `feed_comments`, `likes`, `stories`, `notifications`, `gifts`+`gift_events` (ledger-ready).
- **Auth:** email + OAuth (Google/Apple), JWT access/refresh; `me` becomes the session user; Profile edits persist; "Follow" buttons hit `POST /follows`.
- **Endpoints:** `GET /streams?category=&q=` (Discover search/filter server-side, same props), `GET/POST /feed`, `GET/POST /posts/:id/comments`, `GET/POST /conversations`, `GET /notifications`, `PATCH /me`.
- **Client data layer:** new `src/lib/api.ts` + TanStack Query hooks (`useStreams()`, `useFeed()`, `useConversations()`). **Views/components import hooks instead of `data.ts`** — props and rendering untouched. Keep `data.ts` as seeded demo fixtures for Storybook/tests.
- **Media uploads:** signed-URL upload flow → avatars, feed media, stream thumbnails served via CDN with responsive sizes (replaces picsum/pravatar).

**Exit criteria:** fresh DB → sign up → post/comment/follow/DM persist across reloads; Discover/Feed render from API with identical UI.

### Phase 2 — Real live video _(~2–3 weeks)_

The core differentiator; replace simulated media behind the same components.

- **SFU:** LiveKit (open-source, cloud or self-hosted) — recommended. Alternatives: Agora, Daily, 100ms.
- **`PreJoin` becomes a real device check:** `getUserMedia`, live camera preview in the existing preview tile, real mic level meter, camera flip (`facing`) on mobile, permission-denied states. `onStart(title, category)` → `POST /streams` (status: live) + LiveKit token → navigate to `/live/:id`.
- **`CallRoom` rewiring (props unchanged):**
  - `mode: "watch"` → subscribe to broadcaster's tracks; show real video in the pinned tile.
  - `mode: "broadcast"` → publish local tracks; keep `camOn/micOn/toggleFacing/settings` wiring (they now control real tracks).
  - `mode: "group"` → all participants publish/subscribe; the existing speaker/grid `layout` toggle now switches real tiles.
  - `screenShare` toggle → real `getDisplayMedia` track. `viewers`/`elapsed` come from SFU room events, not intervals.
  - **Keep as graceful extras:** hand raise (publish data-message), low-data/audio-only join, network-quality indicator.
- **Scale-out for broadcasts:** SFU simulcast for few-hundred viewers; larger audiences → LiveKit egress to **RTMP/HLS** (Mux/Cloudflare Stream/IVS) — transparent to the UI.
- **Replays:** record sessions (egress → S3), `live: false` + recording URL powers the existing `REPLAY` badge cards.

**Exit criteria:** two browsers join `/live/:id` and see/hear each other; broadcast + group flows both work through the untouched UI.

### Phase 3 — Realtime social layer _(~2 weeks)_

Kill the remaining timers.

- **Transport:** Socket.IO (or native WS) gateway with Redis pub/sub for multi-instance.
- **Channels & what they replace:**
  - `room:{streamId}` chat → replaces `chatBots`/`initialChat` seeding; messages persist, slow-mode & moderation hooks added.
  - reactions/gifts broadcast → replaces local-only `FloatingReactions` (now animated for everyone, gift events ledgered).
  - viewer count → real presence count; join/leave system messages ("X joined").
  - `user:{id}` → **real incoming calls**: Messages "call" button sends `call.invite` → callee's `IncomingCall` modal (replaces the 14 s fake timer); accept → group room; decline/timeout handled.
  - notifications fan-out → `NotificationsPanel` lists real events (follows, comments, live-of-followed, mentions) with unread badge that the red dot in the header already renders.
  - typing indicators → the existing `Conversation.typing?` field, finally real.
  - stories → 24 h expiring posts; `StoriesBar` renders unseen-story rings from real read-state.

**Exit criteria:** three clients in one room see identical chat/reactions/counts; call ring works between two signed-in users; panel badge counts are real.

### Phase 4 — Professional polish _(~2 weeks, parallelizable)_

- **A11y:** focus traps (already partly in `Modal`), aria labels on icon buttons, keyboard nav for call controls, captioning via LiveKit transcription (optional).
- **PWA:** manifest, service worker, install prompt, push notifications for "X is live".
- **Performance:** image srcset/CDN transforms, route code-splitting, virtualized chat for busy rooms, WebSocket backpressure, bundle budget check in CI.
- **SEO/social:** OG meta per stream (`/live/:id` shared link unfurls with thumbnail), sitemap for profiles.
- **Trust & safety:** report/block users, chat word-filter + rate limits, AutoMod (optional AI), streamer ban/kick tools surfaced in `CallRoom` for `host === me`, age-gate flag on `Stream`.
- **i18n:** extract strings (English first), RTL-ready layouts.
- **Analytics:** wire the Phase 0 shim to PostHog/Amplitude: funnel join→watch→chat→gift.

### Phase 5 — Monetization & scale _(later, optional)_

- Gifts wallet: virtual currency purchase (Stripe), the **existing gift UI unchanged** — `sendGift` debits wallet, `giftToast` confirms, ledger + creator payouts (Stripe Connect).
- Subscriptions/badges for creators; revenue dashboard on `Profile`.
- Scaling: HLS offload >N viewers, Redis cluster, horizontal SFU, CDN edge caching, rate limiting, WAF, cost monitoring.
- Compliance: GDPR data export/delete, ToS/privacy, DMCA for replays.

---

## 5. File-by-file mapping (structure preserved)

| File                                                  | Stays                                                             | Changes (behind the UI)                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `App.tsx`                                             | shell, nav, modal orchestration                                   | tab state → Router; fake `setTimeout` incoming call → WS `call.invite`; media state → LiveKit room context |
| `views/Discover.tsx`                                  | grid, search, categories, Featured badge                          | `streams` → `useStreams()` (server-side filter/search, same filter props); thumbnails → CDN URLs           |
| `views/Feed.tsx`                                      | posts, double-tap like, comments modal                            | `feedPosts` → `useFeed()`; likes/comments persist via mutations; media → uploaded CDN assets               |
| `views/Messages.tsx`                                  | conversation list, thread UI, call buttons                        | data → API + WS; typing indicator real; call button → real invite                                          |
| `views/Profile.tsx`                                   | layout, stats, settings/dark toggles                              | `me` → session user; stats from DB; edit-profile added                                                     |
| `components/CallRoom.tsx`                             | props, controls, layouts, chat panel, gifts                       | color tiles → LiveKit `<VideoTrack>`s; intervals → room events; chat/reactions/gifts → WS broadcast        |
| `components/PreJoin.tsx`                              | same props/steps                                                  | color block → real camera preview + mic meter; publish on start                                            |
| `components/IncomingCall.tsx`                         | modal                                                             | triggered by WS instead of timer; shows real caller                                                        |
| `components/InviteModal.tsx`                          | modal                                                             | copies real `/live/:id` share link; invite → follow list from API                                          |
| `components/NotificationsPanel.tsx`                   | panel                                                             | seeded notes → real notification feed from WS/DB                                                           |
| `components/SettingsPanel.tsx`                        | tabs/toggles/sliders                                              | device prefs persist; sliders bound to real mic/cam constraints; account section real                      |
| `components/StoriesBar.tsx`                           | bar + rings                                                       | users list → followed users w/ active stories; rings = unseen state                                        |
| `data.ts`                                             | kept as **seed/demo fixtures** for tests, Storybook, offline demo | removed from production import graph                                                                       |
| `types.ts`                                            | unchanged                                                         | becomes shared package consumed by client **and** API (single source of truth)                             |
| `utils/cn.ts`, `Icons.tsx`, `Modal.tsx`, `Avatar.tsx` | unchanged                                                         | —                                                                                                          |

---

## 6. Recommended stack (decision points)

| Concern                 | Recommended                                               | Alternatives                              |
| ----------------------- | --------------------------------------------------------- | ----------------------------------------- |
| API                     | NestJS + Prisma + PostgreSQL                              | Fastify, Supabase (fastest start)         |
| Realtime                | Socket.IO + Redis                                         | native WS, Supabase Realtime, Ably/Pusher |
| Media SFU               | **LiveKit** (self-host or Cloud)                          | Agora, Daily, 100ms                       |
| Large-audience playback | LiveKit egress → HLS (Mux/Cloudflare Stream)              | AWS IVS                                   |
| Storage/CDN             | S3 + CloudFront                                           | Cloudflare R2, Supabase Storage           |
| Auth                    | JWT (+OAuth); Supabase Auth if Supabase                   | Auth0, Clerk                              |
| Data fetching           | TanStack Query + Zustand (UI state)                       | Redux Toolkit                             |
| Payments (gifts)        | Stripe + Stripe Connect                                   | Paddle                                    |
| Tests                   | Vitest + RTL + Playwright                                 | Cypress                                   |
| Observability           | Sentry + PostHog                                          | Datadog, LogRocket                        |
| Deploy                  | Client: Vercel/Cloudflare Pages · API: Fly.io/Railway/AWS | Docker everywhere                         |

---

## 7. Milestones & rough timeline (1–2 engineers)

| #   | Milestone                                                       | Est.        |
| --- | --------------------------------------------------------------- | ----------- |
| M0  | Foundations: router, CI, tests, envs                            | week 1      |
| M1  | Auth + API + persistence; UI reads real data                    | weeks 2–4   |
| M2  | Real broadcast/watch/group calls end-to-end                     | weeks 5–7   |
| M3  | Realtime chat, presence, notifications, **real incoming calls** | weeks 8–9   |
| M4  | PWA + a11y + perf + moderation; **public beta**                 | weeks 10–12 |
| M5  | Monetization + scale hardening                                  | post-beta   |

---

## 8. Risks

- **Media infra is the cost driver** → start SFU-only, add HLS offload at a viewer threshold; cap group-room size early.
- **Scope creep in Phase 4** → treat polish items as parallel lane, don't block M2/M3.
- **Moderation before scale** → even basic report/block + word filter must ship before public traffic.
- **Recording/compliance** → replays require consent copy in the Go-Live flow.

## 9. First concrete step

Phase 0 is code-only in this repo: add React Router behind the existing tab UI, set up ESLint/CI/Vitest, and persist dark mode. It changes nothing user-visible and unblocks everything after it.
