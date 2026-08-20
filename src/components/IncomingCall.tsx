import { users } from "../data";
import Avatar from "./Avatar";
import { Icon } from "./Icons";

export default function IncomingCall({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const caller = users[7];
  return (
    <div className="fixed left-1/2 top-4 z-[60] w-[92%] max-w-sm -translate-x-1/2 animate-[slideUp_.3s_ease] rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="pulse-live rounded-full"><Avatar user={caller} size="lg" /></div>
        <div className="flex-1">
          <p className="font-semibold text-slate-800 dark:text-white">{caller.name}</p>
          <p className="text-sm text-slate-500">Incoming video call…</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={onDecline} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-red-500 py-2.5 font-semibold text-white transition hover:bg-red-600">
          <Icon.PhoneOff className="h-5 w-5" /> Decline
        </button>
        <button onClick={onAccept} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500 py-2.5 font-semibold text-white transition hover:bg-emerald-600">
          <Icon.Phone className="h-5 w-5" /> Accept
        </button>
      </div>
    </div>
  );
}
