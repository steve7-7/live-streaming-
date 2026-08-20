import { useState, useEffect } from "react";
import { me } from "../data";
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
  onStart: (title: string, category: string) => void;
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
  const [title, setTitle] = useState(mode === "group" ? "Group Hangout" : "My Live Stream");
  const [category, setCategory] = useState("Talk");
  const [level, setLevel] = useState(6);

  // fake mic level animation — bars render dimmed while the mic is off, so no reset needed
  useEffect(() => {
    if (!micOn) return;
    const t = setInterval(() => setLevel(2 + Math.floor(Math.random() * 16)), 180);
    return () => clearInterval(t);
  }, [micOn]);

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
          {camOn ? (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 50% 40%, ${me.color}55, #0f172a 75%)`,
                transform: facing === "environment" ? "scaleX(-1)" : undefined,
              }}
            >
              <Avatar user={me} size="xl" ring />
              <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-xs backdrop-blur">
                Preview · {facing === "user" ? "Front camera" : "Rear camera"}
              </span>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <Icon.CamOff className="h-10 w-10" />
              <span className="text-sm">Camera is off</span>
            </div>
          )}
        </div>

        {/* Device controls */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setMicOn(!micOn)}
            className={cn(
              "rounded-full p-3.5 transition",
              micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500"
            )}
          >
            {micOn ? <Icon.Mic className="h-5 w-5" /> : <Icon.MicOff className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setCamOn(!camOn)}
            className={cn(
              "rounded-full p-3.5 transition",
              camOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500"
            )}
          >
            {camOn ? <Icon.Cam className="h-5 w-5" /> : <Icon.CamOff className="h-5 w-5" />}
          </button>
          <button
            onClick={toggleFacing}
            className="rounded-full bg-white/10 p-3.5 transition hover:bg-white/20"
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

        <button
          onClick={() => onStart(title || "Live Stream", category)}
          className="mt-6 mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 font-bold transition hover:opacity-90"
        >
          <Icon.Record className="h-5 w-5" />{" "}
          {mode === "group" ? "Start Group Call" : "Go Live Now"}
        </button>
      </div>
    </div>
  );
}
