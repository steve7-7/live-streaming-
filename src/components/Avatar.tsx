import type { User } from "../types";
import { cn } from "../utils/cn";

const sizes: Record<string, string> = {
  xs: "h-7 w-7",
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
};

const statusColor: Record<string, string> = {
  online: "bg-emerald-400",
  away: "bg-amber-400",
  offline: "bg-slate-400",
};

export default function Avatar({
  user,
  size = "md",
  ring = false,
  showStatus = false,
}: {
  user: User;
  size?: keyof typeof sizes;
  ring?: boolean;
  showStatus?: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <img
        src={user.avatar}
        alt={user.name}
        className={cn(
          "rounded-full object-cover bg-slate-200",
          sizes[size],
          ring && "ring-2 ring-offset-2 ring-offset-transparent"
        )}
        style={ring ? { boxShadow: `0 0 0 2px ${user.color}` } : undefined}
      />
      {showStatus && (
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900",
            statusColor[user.status]
          )}
        />
      )}
    </div>
  );
}
