/** Runtime configuration sourced from Vite env vars (see `.env.example`). */
const env = (key: string, fallback = ""): string =>
  (import.meta.env[key] as string | undefined) ?? fallback;

export const config = {
  /** REST API base URL. Calls are enabled separately so the built-in demo remains shippable. */
  apiUrl: env("VITE_API_URL", "/api").replace(/\/$/, ""),
  apiTimeoutMs: Number(env("VITE_API_TIMEOUT_MS", "10000")),
  /** Use the Phase 1 REST data layer instead of seeded demo fixtures. */
  enableApi: env("VITE_ENABLE_API") === "true",
  /** Enable real browser camera/microphone tracks for Phase 2 media flows. */
  enableMedia: env("VITE_ENABLE_MEDIA") === "true",
  /** Socket.IO origin; blank uses the current origin and Vite's WebSocket proxy. */
  wsUrl: env("VITE_WS_URL"),
  enableRealtime: env("VITE_ENABLE_REALTIME") === "true",
  /** LiveKit SFU URL — wired in Phase 2 (real media). */
  livekitUrl: env("VITE_LIVEKIT_URL"),
  /** Sentry DSN — error reporting activates only when set. */
  sentryDsn: env("VITE_SENTRY_DSN"),
  /** Forward analytics events to a provider — wired in Phase 4. */
  enableAnalytics: env("VITE_ENABLE_ANALYTICS") === "true",
} as const;
