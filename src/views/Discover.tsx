import { useState } from "react";
import type { Stream } from "../types";
import { useStreams } from "../hooks/useData";
import Avatar from "../components/Avatar";
import { Icon } from "../components/Icons";
import { cn } from "../utils/cn";

const cats = ["All", "Gaming", "Music", "Food", "Tech", "Art", "Fitness", "Talk"];

export default function Discover({
  onWatch,
  onGoLive,
}: {
  onWatch: (s: Stream) => void;
  onGoLive: (mode: "broadcast" | "group") => void;
}) {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const filters = { category: cat === "All" ? undefined : cat, q: q || undefined };
  const { data: list = [], isPending, isError, refetch } = useStreams(filters);
  const { data: allStreams = [] } = useStreams();

  // Most-watched live stream gets a "Featured" badge (derived from the full result set)
  const liveStreams = allStreams.filter((s) => s.live);
  const featuredId = liveStreams.length
    ? liveStreams.reduce((a, b) => (b.viewers > a.viewers ? b : a)).id
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:pb-8">
      {/* Go live banner */}
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 p-6 text-white shadow-lg shadow-fuchsia-500/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Start broadcasting</h2>
            <p className="mt-1 text-white/80">Go live solo or host a group call with friends.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onGoLive("broadcast")}
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-violet-600 transition hover:scale-105"
            >
              <Icon.Video className="h-5 w-5" /> Go Live
            </button>
            <button
              onClick={() => onGoLive("group")}
              className="flex items-center gap-2 rounded-full bg-white/20 px-5 py-2.5 font-semibold text-white backdrop-blur transition hover:bg-white/30"
            >
              <Icon.Users className="h-5 w-5" /> Group Call
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5">
        <Icon.Search className="h-5 w-5 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search live streams..."
          className="flex-1 bg-transparent text-sm outline-none text-slate-700 dark:text-white placeholder-slate-400"
        />
      </div>

      {/* Categories */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition",
              cat === c
                ? "bg-violet-500 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy={isPending}>
        {isPending &&
          Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="shimmer aspect-[4/3] rounded-2xl border border-slate-200 dark:border-slate-800"
              aria-hidden="true"
            />
          ))}
        {isError && (
          <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center text-slate-500">
            <p className="font-medium">Streams could not be loaded.</p>
            <button
              onClick={() => void refetch()}
              className="rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}
        {!isPending && !isError && list.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-3 py-16 text-slate-400">
            <Icon.Search className="h-12 w-12 opacity-40" />
            <p className="font-medium text-slate-500 dark:text-slate-400">No streams found</p>
            <button
              onClick={() => {
                setQ("");
                setCat("All");
              }}
              className="text-sm text-violet-500 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
        {list.map((s) => (
          <button
            key={s.id}
            onClick={() => onWatch(s)}
            className="group overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="shimmer relative aspect-video overflow-hidden">
              <img
                src={s.thumbnail}
                alt={s.title}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              {s.live ? (
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE
                </span>
              ) : (
                <span className="absolute left-2 top-2 rounded-md bg-slate-700 px-2 py-0.5 text-xs font-bold text-white">
                  REPLAY
                </span>
              )}
              {s.id === featuredId && (
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-xs font-bold text-white shadow">
                  <Icon.Sparkle className="h-3 w-3" /> Featured
                </span>
              )}
              <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
                <Icon.User className="h-3 w-3" /> {s.viewers.toLocaleString()}
              </span>
            </div>
            <div className="flex gap-3 p-3">
              <Avatar user={s.host} size="sm" ring />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                  {s.title}
                </p>
                <p className="text-xs text-slate-500">
                  {s.host.name} · {s.category}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {s.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-500"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
