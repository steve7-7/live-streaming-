import { useState, useEffect, useRef } from "react";
import { me } from "../data";
import { config } from "../config";
import { useAuth } from "../auth/AuthContext";
import { useAudioLevel, useLocalMedia } from "../hooks/useLocalMedia";
import Avatar from "./Avatar";
import { Icon } from "./Icons";
import { cn } from "../utils/cn";

interface Props {
  mode: "broadcast" | "group";
  camOn: boolean;
  micOn: boolean;
  facing: "user" | "environment";
  setCamOn: (v: boolean) => void;
  setMicOn: (v: boolean) => void;
  toggleFacing: () => void;
  onCancel: () => void;
  onStart: (title: string, category: string) => void | Promise<void>;
}

const categories = ["Gaming", "Music", "Food", "Tech", "Art", "Fitness", "Talk"];

export default function PreJoin({
  mode,
  camOn,
  micOn,
  facing,
  setCamOn,
  setMicOn,
  toggleFacing,
  onCancel,
  onStart,
}: Props) {
  const { user } = useAuth();
  const currentUser = user ?? me;
  const [title, setTitle] = useState(mode === "group" ? "Group Hangout" : "My Live Stream");
  const [category, setCategory] = useState("Talk");
  const [demoLevel, setDemoLevel] = useState(6);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, status, error, retry } = useLocalMedia({
    enabled: config.enableMedia,
    camOn,
    micOn,
    facing,
  });
  const realLevel = useAudioLevel(stream, config.enableMedia && micOn);
  const level = config.enableMedia ? realLevel : demoLevel;

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  // Keep the original demo meter when browser media is disabled.
  useEffect(() => {
    if (config.enableMedia || !micOn) return;
    const timer = setInterval(() => setDemoLevel(2 + Math.floor(Math.random() * 16)), 180);
    return () => clearInterval(timer);
  }, [micOn]);

  const start = async () => {
    setStarting(true);
    setStartError("");
    try {
      await onStart(title || "Live Stream", category);
    } catch (cause) {
      setStartError(
        cause instanceof Error ? cause.message : "The live stream could not be created."
      );
      setStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-slate-950 p-4 text-white">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between py-2">
          <button onClick={onCancel} className="rounded-full p-2 hover:bg-white/10">
            <Icon.Close className="h-6 w-6" />
          </button>
          <h2 className="font-semibold">
            {mode === "group" ? "Set up group call" : "Set up your stream"}
          </h2>
          <div className="w-10" />
        </div>

        {/* Camera preview */}
        <div className="relative mt-2 aspect-video overflow-hidden rounded-3xl bg-slate-800">
          {config.enableMedia && status === "ready" && camOn && (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-label="Live camera preview"
              className={cn(
                "absolute inset-0 h-full w-full object-cover",
                facing === "user" && "-scale-x-100"
              )}
            />
          )}

          {config.enableMedia && status === "requesting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
              <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-violet-400" />
              <span className="text-sm">Starting camera and microphone…</span>
            </div>
          )}

          {config.enableMedia && ["denied", "unavailable", "error"].includes(status) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-slate-300">
              <Icon.CamOff className="h-10 w-10 text-slate-400" />
              <div>
                <p className="font-medium">
                  {status === "denied" ? "Camera access is blocked" : "Devices are unavailable"}
                </p>
                <p className="mt-1 max-w-md text-xs text-slate-400">{error}</p>
              </div>
              <button
                type="button"
                onClick={retry}
                className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20"
              >
                Try again
              </button>
            </div>
          )}

          {(!config.enableMedia || status === "ready") && !camOn && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <Icon.CamOff className="h-10 w-10" />
              <span className="text-sm">Camera is off</span>
            </div>
          )}

          {!config.enableMedia && camOn && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 50% 40%, ${currentUser.color}55, #0f172a 75%)`,
              }}
            >
              <Avatar user={currentUser} size="xl" ring />
            </div>
          )}

          {(status === "ready" || !config.enableMedia) && camOn && (
            <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-xs backdrop-blur">
              Preview · {facing === "user" ? "Front camera" : "Rear camera"}
            </span>
          )}
        </div>

        {/* Device controls */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setMicOn(!micOn)}
            aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
            className={cn(
              "rounded-full p-3.5 transition",
              micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500"
            )}
          >
            {micOn ? <Icon.Mic className="h-5 w-5" /> : <Icon.MicOff className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setCamOn(!camOn)}
            aria-label={camOn ? "Turn camera off" : "Turn camera on"}
            className={cn(
              "rounded-full p-3.5 transition",
              camOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500"
            )}
          >
            {camOn ? <Icon.Cam className="h-5 w-5" /> : <Icon.CamOff className="h-5 w-5" />}
          </button>
          <button
            onClick={() => {
              if (config.enableMedia) retry();
              toggleFacing();
            }}
            aria-label="Switch camera"
            disabled={config.enableMedia && status === "requesting"}
            className="rounded-full bg-white/10 p-3.5 transition hover:bg-white/20 disabled:opacity-40"
          >
            <Icon.Switch className="h-5 w-5" />
          </button>
        </div>

        {/* Mic test */}
        <div className="mt-4 rounded-2xl bg-white/5 p-4">
          <p className="mb-2 text-xs text-slate-400">Mic test — speak to see the level</p>
          <div className="flex gap-1">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="h-5 flex-1 rounded-sm transition-all"
                style={{
                  background:
                    micOn && i < level
                      ? i > 14
                        ? "#ef4444"
                        : i > 10
                          ? "#f59e0b"
                          : "#10b981"
                      : "rgba(255,255,255,.12)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Title + category */}
        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your stream a title..."
            className="w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none placeholder-slate-500 ring-1 ring-white/10 focus:ring-violet-500"
          />
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm transition",
                  category === c ? "bg-violet-500" : "bg-white/10 hover:bg-white/20"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {startError && (
          <p role="alert" className="mt-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {startError}
          </p>
        )}
        <button
          onClick={() => void start()}
          disabled={starting || (config.enableMedia && status !== "ready")}
          className="mt-6 mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon.Record className="h-5 w-5" />{" "}
          {starting
            ? "Creating stream…"
            : config.enableMedia && status !== "ready"
              ? "Waiting for devices…"
              : mode === "group"
                ? "Start Group Call"
                : "Go Live Now"}
        </button>
      </div>
    </div>
  );
}
