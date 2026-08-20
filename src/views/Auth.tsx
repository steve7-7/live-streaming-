import { useState } from "react";
import { Icon } from "../components/Icons";
import { useAuth } from "../lib/auth";
import { cn } from "../utils/cn";

/** Full-screen brand splash shown while the session token is being verified. */
export function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-fuchsia-500/30">
        <Icon.Video className="h-7 w-7" />
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-violet-400"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    run(() =>
      mode === "login" ? login(email, password) : register({ name, handle, email, password })
    );

  const inputClass =
    "w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm outline-none text-slate-700 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/40">
            <Icon.Video className="h-7 w-7" />
          </div>
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-3xl font-bold text-transparent">
            Streamly
          </span>
          <p className="text-sm text-slate-400">Go live. Grow your crowd.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-5 flex gap-1 rounded-xl bg-white/5 p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-medium capitalize transition",
                  mode === m ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {mode === "register" && (
              <>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Display name"
                  className={inputClass}
                />
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))}
                  placeholder="Handle (e.g. neonfox)"
                  className={inputClass}
                />
              </>
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className={inputClass}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Password (8+ characters)" : "Password"}
              className={inputClass}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />

            {error && (
              <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
            )}

            <button
              onClick={submit}
              disabled={busy}
              className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
            </button>

            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-500">or</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <button
              onClick={() => run(() => login("demo@streamly.app", "demo1234"))}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <Icon.Sparkle className="h-4 w-4 text-amber-400" />
              Continue with demo account
            </button>
            <p className="text-center text-xs text-slate-500">
              Seeded creators are <span className="font-mono">demo1234</span> — e.g.{" "}
              <span className="font-mono">aria@streamly.app</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
