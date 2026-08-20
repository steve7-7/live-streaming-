/** Runtime configuration sourced from Vite env vars (see `.env.example`). */
const env = (key: string, fallback = ""): string =>
  (import.meta.env[key] as string | undefined) ?? fallback;

export const config = {
  /** REST API base URL — wired in Phase 1 (backend). */
  apiUrl: env("VITE_API_URL", "http://localhost:4000"),
  /** Realtime gateway URL — wired in Phase 3 (WebSocket). */
  wsUrl: env("VITE_WS_URL", "ws://localhost:4000"),
  /** LiveKit SFU URL — wired in Phase 2 (real media). */
  livekitUrl: env("VITE_LIVEKIT_URL"),
  /** Sentry DSN — error reporting activates only when set. */
  sentryDsn: env("VITE_SENTRY_DSN"),
  /** Forward analytics events to a provider — wired in Phase 4. */
  enableAnalytics: env("VITE_ENABLE_ANALYTICS") === "true",
} as const;
