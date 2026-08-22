import { useState } from "react";
import Modal from "./Modal";
import { Icon } from "./Icons";
import { cn } from "../utils/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  onLogout?: () => void;
  camOn: boolean;
  micOn: boolean;
  facing: "user" | "environment";
  setCamOn: (v: boolean) => void;
  setMicOn: (v: boolean) => void;
  setFacing: (v: "user" | "environment") => void;
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "relative h-6 w-11 rounded-full transition",
        on ? "bg-violet-500" : "bg-slate-300 dark:bg-slate-600"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
          on ? "left-[22px]" : "left-0.5"
        )}
      />
    </button>
  );
}

function Slider({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          {icon}
          {label}
        </span>
        <span className="text-slate-400">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-violet-500"
      />
    </div>
  );
}

export default function SettingsPanel({
  open,
  onClose,
  onLogout,
  camOn,
  micOn,
  facing,
  setCamOn,
  setMicOn,
  setFacing,
}: Props) {
  const [tab, setTab] = useState<"video" | "audio" | "general">("video");
  const [resolution, setResolution] = useState("1080p");
  const [micVol, setMicVol] = useState(80);
  const [speakerVol, setSpeakerVol] = useState(70);
  const [noiseCancel, setNoiseCancel] = useState(true);
  const [beauty, setBeauty] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [hd, setHd] = useState(true);
  const [lowLatency, setLowLatency] = useState(true);
  const [autoRecord, setAutoRecord] = useState(false);

  const tabs = [
    { id: "video" as const, label: "Camera", icon: <Icon.Cam className="h-4 w-4" /> },
    { id: "audio" as const, label: "Audio", icon: <Icon.Mic className="h-4 w-4" /> },
    { id: "general" as const, label: "General", icon: <Icon.Settings className="h-4 w-4" /> },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Settings" wide>
      <div className="mb-5 flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition",
              tab === t.id
                ? "bg-white dark:bg-slate-700 text-violet-600 dark:text-white shadow"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "video" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Camera</span>
            <Toggle on={camOn} onChange={() => setCamOn(!camOn)} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Camera facing
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["user", "environment"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFacing(f)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition",
                    facing === f
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  )}
                >
                  <Icon.Switch className="h-4 w-4" />
                  {f === "user" ? "Front" : "Rear"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Resolution
            </p>
            <div className="grid grid-cols-4 gap-2">
              {["480p", "720p", "1080p", "4K"].map((r) => (
                <button
                  key={r}
                  onClick={() => setResolution(r)}
                  className={cn(
                    "rounded-lg border-2 py-2 text-xs font-semibold transition",
                    resolution === r
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
            {[
              { l: "Mirror my video", v: mirror, s: setMirror },
              { l: "Touch-up / beauty filter", v: beauty, s: setBeauty },
              { l: "HD video (uses more data)", v: hd, s: setHd },
            ].map((row) => (
              <div key={row.l} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">{row.l}</span>
                <Toggle on={row.v} onChange={() => row.s(!row.v)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "audio" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Microphone
            </span>
            <Toggle on={micOn} onChange={() => setMicOn(!micOn)} />
          </div>
          <Slider
            label="Microphone volume"
            value={micVol}
            onChange={setMicVol}
            icon={<Icon.Mic className="h-4 w-4" />}
          />
          <Slider
            label="Speaker volume"
            value={speakerVol}
            onChange={setSpeakerVol}
            icon={<Icon.Volume className="h-4 w-4" />}
          />
          <div className="flex items-center justify-between text-sm rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
            <span className="text-slate-600 dark:text-slate-300">AI noise cancellation</span>
            <Toggle on={noiseCancel} onChange={() => setNoiseCancel(!noiseCancel)} />
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
            <p className="mb-2 text-xs text-slate-500">Input level</p>
            <div className="flex gap-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <span
                  key={i}
                  className="h-6 flex-1 rounded-sm transition-all"
                  style={{
                    background:
                      micOn && i < micVol / 5
                        ? i > 15
                          ? "#ef4444"
                          : i > 11
                            ? "#f59e0b"
                            : "#10b981"
                        : "#cbd5e1",
                    opacity: micOn ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "general" && (
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            {[
              { l: "Low latency mode", v: lowLatency, s: setLowLatency },
              { l: "Auto-record broadcasts", v: autoRecord, s: setAutoRecord },
            ].map((row) => (
              <div key={row.l} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">{row.l}</span>
                <Toggle on={row.v} onChange={() => row.s(!row.v)} />
              </div>
            ))}
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10"
            >
              Sign out
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
