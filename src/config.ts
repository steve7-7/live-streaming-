/** Runtime configuration sourced from Vite env vars (see `.env.example`). */
const env = (key: string, fallback = ""): string =>
  (import.meta.env[key] as string | undefined) ?? fallback;

export const config = {
  /** REST API base path — proxied to the backend by Vite (see vite.config.ts). */
  apiUrl: env("VITE_API_URL", "/api"),
  /** Realtime gateway URL — wired in Phase 3 (WebSocket). */
  wsUrl: env("VITE_WS_URL", "ws://localhost:4000"),
  /** LiveKit SFU URL — wired in Phase 2 (real media). */
  livekitUrl: env("VITE_LIVEKIT_URL"),
  /** Sentry DSN — error reporting activates only when set. */
  sentryDsn: env("VITE_SENTRY_DSN"),
  /** Forward analytics events to a provider — wired in Phase 4. */
  enableAnalytics: env("VITE_ENABLE_ANALYTICS") === "true",
} as const;
