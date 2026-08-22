import { useState, type FormEvent } from "react";
import { Icon } from "../components/Icons";
import { ApiError } from "../lib/api";
import { cn } from "../utils/cn";
import { useAuth } from "./AuthContext";

type Mode = "login" | "register";

export default function AuthScreen({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else
        await register({ name: name.trim(), handle: handle.trim(), email: email.trim(), password });
      onAuthenticated?.();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-white">
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-fuchsia-500/25 blur-3xl" />

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 shadow-2xl shadow-violet-950/50 backdrop-blur-xl md:grid-cols-[1.05fr_1fr]">
        <section className="hidden flex-col justify-between bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 p-10 md:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <Icon.Video className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold">Streamly</span>
          </div>
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              Your community is live
            </p>
            <h1 className="text-4xl font-bold leading-tight">
              Share the moment. Join the conversation.
            </h1>
            <p className="mt-4 max-w-sm text-white/75">
              Broadcast, watch, chat, and create alongside people who share what you love.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-300" /> Live communities, around the
            clock
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Icon.Video className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Streamly</span>
          </div>

          <h2 className="text-3xl font-bold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {mode === "login"
              ? "Sign in to continue to Streamly."
              : "Start streaming and connecting in minutes."}
          </p>

          <div
            className="mt-7 grid grid-cols-2 rounded-xl bg-slate-800 p-1"
            aria-label="Authentication mode"
          >
            {(["login", "register"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => switchMode(item)}
                className={cn(
                  "rounded-lg py-2 text-sm font-semibold capitalize transition",
                  mode === item
                    ? "bg-slate-700 text-white shadow"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {item === "login" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            {mode === "register" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Name"
                  value={name}
                  onChange={setName}
                  autoComplete="name"
                  placeholder="Your name"
                />
                <Field
                  label="Handle"
                  value={handle}
                  onChange={setHandle}
                  autoComplete="username"
                  placeholder="@handle"
                />
              </div>
            )}
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="At least 8 characters"
              minLength={8}
            />

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 font-semibold shadow-lg shadow-fuchsia-500/20 transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          {mode === "login" && (
            <button
              type="button"
              onClick={() => {
                setEmail("demo@streamly.local");
                setPassword("streamly-demo");
                setError("");
              }}
              className="mt-4 w-full rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Use demo account
            </button>
          )}
          <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
            By continuing, you agree to Streamly&apos;s Terms and Privacy Policy.
          </p>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete: string;
  placeholder: string;
  minLength?: number;
}) {
  return (
    <label className="block text-sm font-medium text-slate-300">
      {label}
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
      />
    </label>
  );
}
