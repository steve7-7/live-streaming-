import { useEffect, useRef, useState } from "react";
import { conversations, dmThreads } from "../data";
import type { Conversation, DirectMessage } from "../types";
import Avatar from "../components/Avatar";
import { Icon } from "../components/Icons";
import { cn } from "../utils/cn";

export default function Messages({ onCall }: { onCall: (audioOnly: boolean) => void }) {
  const [active, setActive] = useState<Conversation | null>(null);
  const [threads, setThreads] = useState<Record<string, DirectMessage[]>>(dmThreads);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [threads, active]);
  useEffect(() => { setText(""); }, [active]);

  const send = () => {
    if (!active || !text.trim()) return;
    const msg: DirectMessage = { id: `m${Date.now()}`, fromMe: true, text: text.trim(), time: "now" };
    setThreads((t) => ({ ...t, [active.id]: [...(t[active.id] || []), msg] }));
    setText("");
    setTimeout(() => {
      const reply: DirectMessage = { id: `r${Date.now()}`, fromMe: false, text: "Sounds great! 👍", time: "now" };
      setThreads((t) => ({ ...t, [active.id]: [...(t[active.id] || []), reply] }));
    }, 1400);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl lg:h-[calc(100vh-4rem)]">
      {/* List */}
      <div className={cn("w-full border-r border-slate-200 dark:border-slate-800 md:w-80", active && "hidden md:block")}>
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Messages</h1>
          <button className="rounded-full bg-violet-500 p-2 text-white transition hover:bg-violet-600"><Icon.Plus className="h-5 w-5" /></button>
        </div>
        <div className="space-y-1 px-2">
          {conversations.map((c) => (
            <button key={c.id} onClick={() => setActive(c)}
              className={cn("flex w-full items-center gap-3 rounded-2xl p-3 text-left transition", active?.id === c.id ? "bg-violet-50 dark:bg-violet-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800")}>
              <Avatar user={c.user} size="md" showStatus />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{c.user.name}</p>
                  <span className="text-xs text-slate-400">{c.time}</span>
                </div>
                <p className={cn("truncate text-xs", c.typing ? "text-violet-500 font-medium" : "text-slate-500")}>
                  {c.typing ? "typing..." : c.lastMessage}
                </p>
              </div>
              {c.unread > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">{c.unread}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      {active ? (
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 p-3">
            <button onClick={() => setActive(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden">
              <Icon.Close className="h-5 w-5" />
            </button>
            <Avatar user={active.user} size="sm" showStatus />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{active.user.name}</p>
              <p className="text-xs text-emerald-500 capitalize">{active.user.status}</p>
            </div>
            <button onClick={() => onCall(true)} className="rounded-full p-2.5 text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800"><Icon.Phone className="h-5 w-5" /></button>
            <button onClick={() => onCall(false)} className="rounded-full p-2.5 text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800"><Icon.Video className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {(threads[active.id] || []).map((m) => (
              <div key={m.id} className={cn("flex", m.fromMe ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[75%] rounded-2xl px-4 py-2 text-sm animate-[slideUp_.2s_ease]",
                  m.fromMe ? "rounded-br-md bg-violet-500 text-white" : "rounded-bl-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200")}>
                  {m.text}
                  <span className={cn("ml-2 text-[10px]", m.fromMe ? "text-white/70" : "text-slate-400")}>{m.time}</span>
                </div>
              </div>
            ))}
            <div ref={end} />
          </div>
          <div className="border-t border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2">
              <button className="text-slate-400"><Icon.Smile className="h-5 w-5" /></button>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Message..." className="flex-1 bg-transparent text-sm outline-none text-slate-700 dark:text-white placeholder-slate-400" />
              <button onClick={send} className="text-violet-500 hover:text-violet-600 transition"><Icon.Send className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden flex-1 flex-col items-center justify-center gap-3 text-slate-400 md:flex">
          <div className="rounded-full bg-violet-50 dark:bg-violet-500/10 p-6"><Icon.Chat className="h-10 w-10 text-violet-400" /></div>
          <p className="font-medium">Select a conversation</p>
          <p className="text-sm">Start chatting, or jump on a call.</p>
        </div>
      )}
    </div>
  );
}
