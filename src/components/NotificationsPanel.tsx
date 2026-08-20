import Modal from "./Modal";
import Avatar from "./Avatar";
import { Icon } from "./Icons";
import { users } from "../data";

const notes = [
  {
    u: users[0],
    text: "started a live stream",
    time: "now",
    icon: <Icon.Video className="h-3.5 w-3.5" />,
    color: "bg-red-500",
    unread: true,
  },
  {
    u: users[3],
    text: "liked your broadcast",
    time: "5m",
    icon: <Icon.Heart className="h-3.5 w-3.5" />,
    color: "bg-pink-500",
    unread: true,
  },
  {
    u: users[7],
    text: "invited you to a group call",
    time: "12m",
    icon: <Icon.Users className="h-3.5 w-3.5" />,
    color: "bg-violet-500",
    unread: true,
  },
  {
    u: users[1],
    text: 'commented: "amazing setup!"',
    time: "1h",
    icon: <Icon.Comment className="h-3.5 w-3.5" />,
    color: "bg-cyan-500",
    unread: false,
  },
  {
    u: users[5],
    text: "started following you",
    time: "2h",
    icon: <Icon.User className="h-3.5 w-3.5" />,
    color: "bg-emerald-500",
    unread: false,
  },
  {
    u: users[6],
    text: "sent you a gift 🎁",
    time: "3h",
    icon: <Icon.Gift className="h-3.5 w-3.5" />,
    color: "bg-amber-500",
    unread: false,
  },
];

export default function NotificationsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Notifications">
      <div className="space-y-1">
        {notes.map((n, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-2xl p-2.5 ${n.unread ? "bg-violet-50 dark:bg-violet-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            <div className="relative">
              <Avatar user={n.u} size="md" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white ring-2 ring-white dark:ring-slate-900 ${n.color}`}
              >
                {n.icon}
              </span>
            </div>
            <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">
              <span className="font-semibold">{n.u.name}</span> {n.text}
            </p>
            <span className="text-xs text-slate-400">{n.time}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
