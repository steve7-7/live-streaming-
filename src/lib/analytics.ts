import { config } from "../config";
import { logger } from "./logger";

/**
 * Product analytics shim. No-ops until a provider is wired in (Phase 4/5),
 * but call sites are instrumented today so nothing needs re-touching later.
 */
export function track(event: string, props?: Record<string, unknown>) {
  if (import.meta.env.DEV) logger.debug(`track:${event}`, props);
  if (config.enableAnalytics) {
    // Phase 4: forward to PostHog/Amplitude.
  }
}

/** Initialises error reporting (Sentry) when a DSN is configured. */
export function initObservability() {
  if (!config.sentryDsn) return;
  import("@sentry/react")
    .then((Sentry) => {
      Sentry.init({ dsn: config.sentryDsn, tracesSampleRate: 0.1 });
      logger.info("error reporting initialised");
    })
    .catch((e: unknown) => logger.warn("error reporting failed to load", e));
}
