import { useState } from "react";
import Modal from "./Modal";
import Avatar from "./Avatar";
import { Icon } from "./Icons";
import { users } from "../data";
import { cn } from "../utils/cn";

export default function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [invited, setInvited] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const link = "https://streamly.live/join/x7k9-live";

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) || u.handle.includes(query.toLowerCase())
  );

  const copy = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite people">
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2">
        <span className="flex-1 truncate px-2 text-sm text-slate-600 dark:text-slate-300">
          {link}
        </span>
        <button
          onClick={copy}
          className={cn(
            "flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition",
            copied ? "bg-emerald-500" : "bg-violet-500 hover:bg-violet-600"
          )}
        >
          {copied ? (
            <>
              <Icon.Check className="h-4 w-4" /> Copied
            </>
          ) : (
            <>
              <Icon.Copy className="h-4 w-4" /> Copy
            </>
          )}
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2">
        <Icon.Search className="h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search friends..."
          className="flex-1 bg-transparent text-sm outline-none text-slate-700 dark:text-white placeholder-slate-400"
        />
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto">
        {filtered.map((u) => {
          const done = invited.includes(u.id);
          return (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Avatar user={u} size="sm" showStatus />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                  {u.name}
                </p>
                <p className="truncate text-xs text-slate-400">{u.handle}</p>
              </div>
              <button
                onClick={() =>
                  setInvited((p) => (done ? p.filter((x) => x !== u.id) : [...p, u.id]))
                }
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  done
                    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-violet-500 text-white hover:bg-violet-600"
                )}
              >
                {done ? "Invited ✓" : "Invite"}
              </button>
            </div>
          );
        })}
      </div>

      {invited.length > 0 && (
        <div className="mt-4 rounded-xl bg-violet-50 dark:bg-violet-500/10 p-3 text-center text-sm font-medium text-violet-600 dark:text-violet-300">
          {invited.length} {invited.length === 1 ? "person" : "people"} invited 🎉
        </div>
      )}
    </Modal>
  );
}
