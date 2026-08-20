import Avatar from "./Avatar";
import { Icon } from "./Icons";
import { useAuth } from "../lib/auth";
import { useUsers } from "../lib/hooks";

export default function StoriesBar({ onGoLive }: { onGoLive: () => void }) {
  const { user: me } = useAuth();
  const { data: users = [] } = useUsers();

  if (!me) return null;

  return (
    <div className="flex gap-3 overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <button onClick={onGoLive} className="flex w-16 shrink-0 flex-col items-center gap-1">
        <div className="relative">
          <Avatar user={me} size="lg" />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-white ring-2 ring-white dark:ring-slate-900">
            <Icon.Plus className="h-4 w-4" />
          </span>
        </div>
        <span className="text-xs text-slate-500">Your story</span>
      </button>
      {users.map((u) => (
        <button key={u.id} className="flex w-16 shrink-0 flex-col items-center gap-1">
          <div className="rounded-full bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-amber-400 p-0.5">
            <div className="rounded-full border-2 border-white dark:border-slate-900">
              <Avatar user={u} size="lg" />
            </div>
          </div>
          <span className="w-full truncate text-xs text-slate-600 dark:text-slate-300">
            {u.name.split(" ")[0]}
          </span>
        </button>
      ))}
    </div>
  );
}
