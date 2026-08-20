import type { ReactNode } from "react";
import type { NotificationKind } from "../types";
import Modal from "./Modal";
import Avatar from "./Avatar";
import { Icon } from "./Icons";
import { useNotifications } from "../lib/hooks";
import { cn } from "../utils/cn";

const kindMeta: Record<NotificationKind, { icon: ReactNode; color: string }> = {
  live: { icon: <Icon.Video className="h-3.5 w-3.5" />, color: "bg-red-500" },
  like: { icon: <Icon.Heart className="h-3.5 w-3.5" />, color: "bg-pink-500" },
  invite: { icon: <Icon.Users className="h-3.5 w-3.5" />, color: "bg-violet-500" },
  comment: { icon: <Icon.Comment className="h-3.5 w-3.5" />, color: "bg-cyan-500" },
  follow: { icon: <Icon.User className="h-3.5 w-3.5" />, color: "bg-emerald-500" },
  gift: { icon: <Icon.Gift className="h-3.5 w-3.5" />, color: "bg-amber-500" },
};

export default function NotificationsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: notes = [] } = useNotifications();
  return (
    <Modal open={open} onClose={onClose} title="Notifications">
      <div className="space-y-1">
        {notes.map((n) => (
          <div
            key={n.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl p-2.5",
              n.unread
                ? "bg-violet-50 dark:bg-violet-500/10"
                : "hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <div className="relative">
              <Avatar user={n.actor} size="md" />
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white ring-2 ring-white dark:ring-slate-900",
                  kindMeta[n.kind]?.color
                )}
              >
                {kindMeta[n.kind]?.icon}
              </span>
            </div>
            <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">
              <span className="font-semibold">{n.actor.name}</span> {n.text}
            </p>
            <span className="text-xs text-slate-400">{n.time}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
