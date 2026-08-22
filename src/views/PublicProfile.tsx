import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import { Icon } from "../components/Icons";
import { usePublicProfile } from "../hooks/useData";
import { useSetFollow } from "../hooks/useSocialMutations";
import type { Stream } from "../types";
import { cn } from "../utils/cn";

export default function PublicProfile({ onWatch }: { onWatch: (stream: Stream) => void }) {
  const { handle = "" } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { data: profile, isPending, isError, refetch } = usePublicProfile(handle);
  const followMutation = useSetFollow();
  const [followingOverride, setFollowingOverride] = useState<boolean | null>(null);

  if (isPending) {
    return (
      <div
        className="shimmer mx-auto mt-4 min-h-[32rem] max-w-3xl rounded-3xl"
        aria-label="Loading profile"
      />
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-bold">Profile could not be loaded</h1>
        <button
          onClick={() => void refetch()}
          className="mt-4 rounded-full bg-violet-500 px-5 py-2 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
          <Icon.User className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Profile not found</h1>
        <p className="mt-1 text-sm text-slate-500">This creator may have changed their handle.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-5 text-sm font-semibold text-violet-500 hover:underline"
        >
          Back to Discover
        </button>
      </div>
    );
  }

  const ownProfile = currentUser?.id === profile.user.id;
  const following = followingOverride ?? profile.following;
  const followerCount =
    profile.stats.followers +
    (followingOverride === null ? 0 : following === profile.following ? 0 : following ? 1 : -1);

  const toggleFollow = async () => {
    if (!currentUser) {
      navigate(`/login?next=/u/${handle.replace(/^@/, "")}`);
      return;
    }
    const next = !following;
    setFollowingOverride(next);
    try {
      await followMutation.mutateAsync({ userId: profile.user.id, following: next });
    } catch {
      setFollowingOverride(following);
    }
  };

  const stats = [
    { label: "Followers", value: followerCount.toLocaleString() },
    { label: "Following", value: profile.stats.following.toLocaleString() },
    { label: "Streams", value: profile.stats.streams.toLocaleString() },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-4 md:pb-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="h-32 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex items-end justify-between gap-4">
            <div className="rounded-full border-4 border-white dark:border-slate-900">
              <Avatar user={profile.user} size="xl" showStatus />
            </div>
            {ownProfile ? (
              <button
                onClick={() => navigate("/profile")}
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold dark:border-slate-700"
              >
                Edit your profile
              </button>
            ) : (
              <button
                onClick={() => void toggleFollow()}
                disabled={followMutation.isPending}
                className={cn(
                  "rounded-full px-6 py-2 text-sm font-semibold transition disabled:opacity-60",
                  following
                    ? "border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                    : "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
                )}
              >
                {following ? "Following ✓" : "Follow"}
              </button>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-800 dark:text-white">
            {profile.user.name}
          </h1>
          <p className="text-slate-500">{profile.user.handle}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            🎥 Creator on Streamly · Sharing live moments with the community ✨
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800"
              >
                <p className="text-xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800 dark:text-white">
          <Icon.Video className="h-5 w-5" /> Streams
        </h2>
        {profile.streams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400 dark:border-slate-700">
            No streams to show yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {profile.streams.map((stream) => (
              <button
                key={stream.id}
                onClick={() => onWatch(stream)}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="shimmer relative aspect-video">
                  <img
                    src={stream.thumbnail}
                    alt={stream.title}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    {stream.viewers.toLocaleString()} views
                  </span>
                </div>
                <p className="truncate p-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                  {stream.title}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
