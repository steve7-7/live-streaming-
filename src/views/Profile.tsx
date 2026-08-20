import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useMeStats, useMyStreams, useUpdateMe, useUsers } from "../lib/hooks";
import Avatar from "../components/Avatar";
import { Icon } from "../components/Icons";
import Modal from "../components/Modal";

const fmtCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n);

export default function Profile({
  dark,
  onToggleDark,
  onOpenSettings,
}: {
  dark: boolean;
  onToggleDark: () => void;
  onOpenSettings: () => void;
}) {
  const { user: me, setUser, logout } = useAuth();
  const { data: stats } = useMeStats();
  const { data: users = [] } = useUsers();
  const { data: myStreams = [] } = useMyStreams();
  const updateMe = useUpdateMe();

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  if (!me) return null;

  const statItems = [
    { label: "Followers", value: fmtCount(me.followers) },
    { label: "Following", value: stats ? fmtCount(stats.following) : "—" },
    { label: "Streams", value: stats ? fmtCount(stats.streams) : "—" },
  ];

  const openEdit = () => {
    setName(me.name);
    setBio(me.bio ?? "");
    setEditOpen(true);
  };

  const saveEdit = () => {
    updateMe.mutate(
      { name: name.trim(), bio: bio.trim() },
      {
        onSuccess: (user) => {
          setUser(user);
          setEditOpen(false);
        },
      }
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-4 md:pb-8">
      <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="h-32 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex items-end justify-between">
            <div className="rounded-full border-4 border-white dark:border-slate-900">
              <Avatar user={me} size="xl" showStatus />
            </div>
            <div className="flex gap-2">
              <button
                onClick={onToggleDark}
                className="rounded-full border border-slate-200 dark:border-slate-700 p-2.5 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {dark ? <Icon.Sun className="h-5 w-5" /> : <Icon.Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={onOpenSettings}
                className="rounded-full border border-slate-200 dark:border-slate-700 p-2.5 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Icon.Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-800 dark:text-white">{me.name}</h1>
          <p className="text-slate-500">{me.handle}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{me.bio}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {statItems.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3 text-center"
              >
                <p className="text-xl font-bold text-slate-800 dark:text-white">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={openEdit}
            className="mt-4 w-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2.5 font-semibold text-white transition hover:opacity-90"
          >
            Edit Profile
          </button>
          <button
            onClick={logout}
            className="mt-2 w-full rounded-full border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-red-500 dark:hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Followers preview */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800 dark:text-white">
          <Icon.Users className="h-5 w-5" /> Recent followers
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {users.map((u) => (
            <div key={u.id} className="flex w-20 shrink-0 flex-col items-center gap-1 text-center">
              <Avatar user={u} size="lg" ring showStatus />
              <span className="truncate w-full text-xs text-slate-600 dark:text-slate-300">
                {u.name.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Past streams */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800 dark:text-white">
          <Icon.Video className="h-5 w-5" /> Your streams
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {myStreams.slice(0, 4).map((s) => (
            <div
              key={s.id}
              className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <div className="shimmer relative aspect-video">
                <img src={s.thumbnail} alt="" className="h-full w-full object-cover" />
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {s.viewers.toLocaleString()} views
                </span>
              </div>
              <p className="truncate p-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                {s.title}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Edit profile modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile">
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="mb-1.5 block text-xs font-medium text-slate-500">
              Display name
            </label>
            <input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm outline-none text-slate-700 dark:text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label htmlFor="edit-bio" className="mb-1.5 block text-xs font-medium text-slate-500">
              Bio
            </label>
            <textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm outline-none text-slate-700 dark:text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <button
            onClick={saveEdit}
            disabled={updateMe.isPending || name.trim().length < 2}
            className="w-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {updateMe.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
