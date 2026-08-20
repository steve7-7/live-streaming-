import { useEffect, useRef, useState } from "react";
import type { Stream, ChatMessage, Reaction, User } from "../types";
import { me, users, initialChat, chatBots, emojis } from "../data";
import { Icon } from "./Icons";
import Avatar from "./Avatar";
import FloatingReactions from "./FloatingReactions";
import { cn } from "../utils/cn";

interface Props {
  stream: Stream;
  mode: "watch" | "broadcast" | "group";
  onLeave: () => void;
  onOpenSettings: () => void;
  camOn: boolean;
  micOn: boolean;
  facing: "user" | "environment";
  setCamOn: (v: boolean) => void;
  setMicOn: (v: boolean) => void;
  toggleFacing: () => void;
  onInvite: () => void;
}

let rid = 0;

export default function CallRoom({
  stream, mode, onLeave, onOpenSettings, camOn, micOn, facing,
  setCamOn, setMicOn, toggleFacing, onInvite,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialChat);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [input, setInput] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [screenShare, setScreenShare] = useState(false);
  const [layout, setLayout] = useState<"speaker" | "grid">(mode === "group" ? "grid" : "speaker");
  const [elapsed, setElapsed] = useState(0);
  const [viewers, setViewers] = useState(stream.viewers);
  const [pinned, setPinned] = useState<User>(mode === "watch" ? stream.host : me);
  const [likes, setLikes] = useState(0);
  const [showGifts, setShowGifts] = useState(false);
  const [giftToast, setGiftToast] = useState<string | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const gifts = [
    { e: "🌹", n: "Rose", c: 10 }, { e: "🎉", n: "Party", c: 50 }, { e: "💎", n: "Diamond", c: 100 },
    { e: "👑", n: "Crown", c: 250 }, { e: "🚀", n: "Rocket", c: 500 }, { e: "🦄", n: "Unicorn", c: 1000 },
  ];

  const sendGift = (g: { e: string; n: string }) => {
    setShowGifts(false);
    setGiftToast(`You sent a ${g.n} ${g.e}`);
    for (let i = 0; i < 5; i++) setTimeout(() => spawnReaction(g.e), i * 120);
    setMessages((m) => [...m, { id: `g${Date.now()}`, user: me, text: `sent a ${g.n} ${g.e}`, time: "now", system: true }]);
    setTimeout(() => setGiftToast(null), 2500);
  };

  const participants: User[] = mode === "group"
    ? [me, users[0], users[1], users[3], users[6], users[7]]
    : mode === "broadcast"
      ? [me]
      : [stream.host];

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setViewers((v) => Math.max(1, v + Math.floor(Math.random() * 21) - 8));
      if (Math.random() > 0.35) {
        const u = users[Math.floor(Math.random() * users.length)];
        const text = chatBots[Math.floor(Math.random() * chatBots.length)];
        setMessages((m) => [...m.slice(-40), { id: `b${Date.now()}`, user: u, text, time: "now" }]);
      }
      if (Math.random() > 0.5) spawnReaction(emojis[Math.floor(Math.random() * emojis.length)]);
    }, 2600);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const spawnReaction = (emoji: string) => {
    const r: Reaction = { id: `r${rid++}`, emoji, x: 5 + Math.random() * 80 };
    setReactions((prev) => [...prev, r]);
    setTimeout(() => setReactions((prev) => prev.filter((x) => x.id !== r.id)), 3000);
  };

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, { id: `me${Date.now()}`, user: me, text: input.trim(), time: "now" }]);
    setInput("");
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const VideoTile = ({ user, big }: { user: User; big?: boolean }) => {
    const isMe = user.id === "me";
    const showCam = isMe ? camOn : true;
    return (
      <div className={cn(
        "relative overflow-hidden rounded-2xl bg-slate-800 flex items-center justify-center",
        big ? "h-full w-full" : "aspect-video"
      )}>
        {showCam ? (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 40%, ${user.color}44, #0f172a 75%)`,
              transform: isMe && facing === "environment" ? "scaleX(-1)" : undefined,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Avatar user={user} size={big ? "xl" : "lg"} ring />
                {isMe && facing === "environment" && (
                  <span className="mt-2 block text-[10px] text-white/60">Rear camera</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Avatar user={user} size={big ? "xl" : "lg"} />
            <Icon.CamOff className="h-5 w-5" />
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/50 px-2 py-1 backdrop-blur">
          {isMe ? (micOn ? <Icon.Mic className="h-3 w-3 text-emerald-400" /> : <Icon.MicOff className="h-3 w-3 text-red-400" />)
            : <Icon.Mic className="h-3 w-3 text-emerald-400" />}
          <span className="text-xs font-medium text-white">{user.name}</span>
        </div>
        {user.id === pinned.id && (
          <div className="absolute top-2 right-2 rounded-md bg-violet-500/80 p-1"><Icon.Pin className="h-3 w-3 text-white" /></div>
        )}
        {isMe && handRaised && (
          <div className="absolute top-2 left-2 animate-bounce rounded-md bg-amber-400 p-1"><Icon.Hand className="h-3.5 w-3.5 text-white" /></div>
        )}
      </div>
    );
  };

  const isLive = mode !== "watch";

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 md:flex-row">
      {/* Stage */}
      <div className="relative flex-1 min-h-0">
        <div className="relative h-full w-full p-2 sm:p-4">
          {layout === "speaker" ? (
            <div className="relative h-full">
              <VideoTile user={pinned} big />
              {participants.length > 1 && (
                <div className="absolute bottom-4 right-4 flex gap-2">
                  {participants.filter((p) => p.id !== pinned.id).slice(0, 3).map((p) => (
                    <button key={p.id} onClick={() => setPinned(p)} className="w-28 sm:w-36 transition hover:scale-105">
                      <VideoTile user={p} />
                    </button>
                  ))}
                </div>
              )}
              {mode === "broadcast" && camOn && (
                <div className="absolute top-4 right-4 w-24 sm:w-32 opacity-90">
                  <div className="relative overflow-hidden rounded-xl border-2 border-white/20 aspect-video bg-slate-800">
                    <div className="absolute inset-0" style={{ background: `radial-gradient(circle, ${me.color}55, #0f172a)` }} />
                    <span className="absolute bottom-1 left-1 text-[9px] text-white/80">Preview</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid h-full auto-rows-fr grid-cols-2 gap-2 md:grid-cols-3">
              {participants.map((p) => (
                <button key={p.id} onClick={() => setPinned(p)}><VideoTile user={p} /></button>
              ))}
            </div>
          )}
          <FloatingReactions reactions={reactions} />
        </div>

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="pulse-live flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
                <Icon.Record className="h-3 w-3" /> LIVE
              </span>
            )}
            <span className="rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">{fmt(elapsed)}</span>
            <span className="flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              <Icon.User className="h-3 w-3" /> {viewers.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setLayout(l => l === "speaker" ? "grid" : "speaker")} className="rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70 transition">
              {layout === "speaker" ? <Icon.Grid className="h-4 w-4" /> : <Icon.User className="h-4 w-4" />}
            </button>
            <button onClick={onInvite} className="rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70 transition"><Icon.Plus className="h-4 w-4" /></button>
            <button onClick={onOpenSettings} className="rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70 transition"><Icon.Settings className="h-4 w-4" /></button>
            <button onClick={() => setShowChat(s => !s)} className="rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70 transition md:hidden"><Icon.Chat className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Stream title */}
        <div className="absolute bottom-24 left-3 right-3 sm:bottom-28 sm:left-4 pointer-events-none">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur">
            <Avatar user={mode === "watch" ? stream.host : me} size="xs" />
            <span className="truncate text-sm font-medium text-white">{stream.title}</span>
          </div>
        </div>

        {/* Control bar */}
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <div className="mx-auto flex max-w-xl items-center justify-center gap-2 rounded-2xl bg-black/50 p-2 backdrop-blur-xl">
            <button onClick={() => setMicOn(!micOn)} className={cn("rounded-xl p-3 text-white transition", micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500 hover:bg-red-600")}>
              {micOn ? <Icon.Mic className="h-5 w-5" /> : <Icon.MicOff className="h-5 w-5" />}
            </button>
            <button onClick={() => setCamOn(!camOn)} className={cn("rounded-xl p-3 text-white transition", camOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500 hover:bg-red-600")}>
              {camOn ? <Icon.Cam className="h-5 w-5" /> : <Icon.CamOff className="h-5 w-5" />}
            </button>
            <button onClick={toggleFacing} className="rounded-xl bg-white/10 p-3 text-white transition hover:bg-white/20"><Icon.Switch className="h-5 w-5" /></button>
            <button onClick={() => setScreenShare(s => !s)} className={cn("rounded-xl p-3 text-white transition hidden sm:block", screenShare ? "bg-violet-500 hover:bg-violet-600" : "bg-white/10 hover:bg-white/20")}><Icon.Screen className="h-5 w-5" /></button>
            <button onClick={() => setHandRaised(h => !h)} className={cn("rounded-xl p-3 text-white transition", handRaised ? "bg-amber-400 hover:bg-amber-500" : "bg-white/10 hover:bg-white/20")}><Icon.Hand className="h-5 w-5" /></button>
            <button onClick={() => { setShowGifts(s => !s); setShowEmoji(false); }} className={cn("rounded-xl p-3 text-white transition", showGifts ? "bg-fuchsia-500" : "bg-white/10 hover:bg-white/20")}><Icon.Gift className="h-5 w-5" /></button>
            <div className="relative">
              <button onClick={() => { setShowEmoji(s => !s); setShowGifts(false); }} className="rounded-xl bg-white/10 p-3 text-white transition hover:bg-white/20"><Icon.Smile className="h-5 w-5" /></button>
              {showEmoji && (
                <>
                  <div className="fixed inset-0 z-0" onClick={() => setShowEmoji(false)} />
                  <div className="absolute bottom-14 left-1/2 z-10 -translate-x-1/2 flex gap-1 rounded-2xl bg-slate-900 border border-white/10 p-2 shadow-2xl">
                    {emojis.map((e) => (
                      <button key={e} onClick={() => { spawnReaction(e); setShowEmoji(false); }} className="rounded-lg p-1.5 text-xl transition hover:bg-white/10 hover:scale-125">{e}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={onLeave} className="rounded-xl bg-red-500 p-3 text-white transition hover:bg-red-600"><Icon.PhoneOff className="h-5 w-5" /></button>
          </div>
        </div>

        {/* Gifts panel */}
        {showGifts && (
          <div className="absolute inset-x-3 bottom-28 z-10 mx-auto max-w-md rounded-3xl bg-slate-900/95 border border-white/10 p-4 backdrop-blur-xl sm:bottom-32">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-white"><Icon.Gift className="h-4 w-4 text-fuchsia-400" /> Send a gift</h4>
              <button onClick={() => setShowGifts(false)} className="text-slate-400 hover:text-white"><Icon.Close className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {gifts.map((g) => (
                <button key={g.n} onClick={() => sendGift(g)} className="flex flex-col items-center gap-1 rounded-2xl bg-white/5 p-3 transition hover:bg-white/10 hover:scale-105">
                  <span className="text-3xl">{g.e}</span>
                  <span className="text-xs font-medium text-white">{g.n}</span>
                  <span className="text-[10px] text-amber-400">◈ {g.c}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Gift toast */}
        {giftToast && (
          <div className="absolute left-1/2 top-20 z-20 -translate-x-1/2 animate-[slideUp_.3s_ease] rounded-full bg-gradient-to-r from-fuchsia-500 to-amber-400 px-5 py-2 text-sm font-semibold text-white shadow-xl">
            {giftToast}
          </div>
        )}

        {/* Quick like button */}
        <button
          onClick={() => { setLikes(l => l + 1); spawnReaction("❤️"); }}
          className="absolute bottom-24 right-3 sm:right-4 flex flex-col items-center gap-1 text-white"
        >
          <span className="rounded-full bg-black/50 p-3 backdrop-blur transition hover:scale-110 active:scale-90"><Icon.Heart className="h-6 w-6" /></span>
          <span className="text-xs font-medium">{(stream.viewers + likes).toLocaleString()}</span>
        </button>
      </div>

      {/* Chat sidebar */}
      <div className={cn(
        "flex flex-col border-slate-800 bg-slate-900 transition-all md:flex md:w-80 md:border-l md:h-auto",
        showChat ? "h-[45vh] border-t flex" : "hidden"
      )}>
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h3 className="flex items-center gap-2 font-semibold text-white"><Icon.Chat className="h-4 w-4" /> Live Chat</h3>
          <span className="text-xs text-slate-400">{viewers.toLocaleString()} watching</span>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {messages.map((m) => (
            m.system ? (
              <div key={m.id} className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-500/20 to-amber-400/10 px-2 py-1.5 text-sm animate-[fade_.3s_ease]">
                <Avatar user={m.user} size="xs" />
                <span className="text-amber-200"><span className="font-semibold text-white">{m.user.name}</span> {m.text}</span>
              </div>
            ) : (
              <div key={m.id} className="flex gap-2 text-sm animate-[fade_.3s_ease]">
                <Avatar user={m.user} size="xs" />
                <div className="min-w-0">
                  <span className="font-semibold" style={{ color: m.user.color }}>{m.user.name}</span>{" "}
                  <span className="text-slate-300 break-words">{m.text}</span>
                </div>
              </div>
            )
          ))}
          <div ref={chatEnd} />
        </div>
        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Say something..."
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
            <button onClick={send} className="text-violet-400 hover:text-violet-300 transition"><Icon.Send className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
