/** Minimal structured logger — transports (e.g. remote drain) get swapped in one place. */
type Level = "debug" | "info" | "warn" | "error";

const write = (level: Level, msg: string, ctx?: unknown) => {
  const line = `[streamly:${level}] ${msg}`;
  if (ctx === undefined) console[level](line);
  else console[level](line, ctx);
};

export const logger = {
  debug: (msg: string, ctx?: unknown) => {
    if (import.meta.env.DEV) write("debug", msg, ctx);
  },
  info: (msg: string, ctx?: unknown) => write("info", msg, ctx),
  warn: (msg: string, ctx?: unknown) => write("warn", msg, ctx),
  error: (msg: string, ctx?: unknown) => write("error", msg, ctx),
};
