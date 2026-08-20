import { useEffect, useState } from "react";
import type { Stream } from "./types";
import { me } from "./data";
import { Icon } from "./components/Icons";
import Avatar from "./components/Avatar";
import Discover from "./views/Discover";
import Feed from "./views/Feed";
import Messages from "./views/Messages";
import Profile from "./views/Profile";
import CallRoom from "./components/CallRoom";
import SettingsPanel from "./components/SettingsPanel";
import InviteModal from "./components/InviteModal";
import IncomingCall from "./components/IncomingCall";
import PreJoin from "./components/PreJoin";
import NotificationsPanel from "./components/NotificationsPanel";
import { cn } from "./utils/cn";

type Tab = "discover" | "feed" | "messages" | "profile";
type CallState = { stream: Stream; mode: "watch" | "broadcast" | "group" } | null;

export default function App() {
  const [tab, setTab] = useState<Tab>("discover");
  const [dark, setDark] = useState(false);
  const [call, setCall] = useState<CallState>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [incoming, setIncoming] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [lobby, setLobby] = useState<null | { mode: "broadcast" | "group" }>(null);

  // media device state — shared across call & settings
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [facing, setFacing] = useState<"user" | "environment">("user");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Simulate an incoming call once after initial mount, not on re-renders
  useEffect(() => {
    const t = setTimeout(() => setIncoming(true), 14000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const groupStream: Stream = {
    id: "group", title: "Group Call", host: me, category: "Call", thumbnail: "", viewers: 5, live: true, tags: [],
  };

  const startCall = (mode: "watch" | "broadcast" | "group", stream?: Stream) => {
    setCall({ stream: stream || (mode === "broadcast" ? { ...groupStream, title: "Your Broadcast" } : groupStream), mode });
  };

  const openLobby = (mode: "broadcast" | "group") => setLobby({ mode });

  const launchFromLobby = (title: string, category: string) => {
    if (!lobby) return;
    setCall({
      stream: { ...groupStream, title, category, live: true, host: me },
      mode: lobby.mode,
    });
    setLobby(null);
  };

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "discover", label: "Discover", icon: <Icon.Compass className="h-6 w-6" /> },
    { id: "feed", label: "Feed", icon: <Icon.Home className="h-6 w-6" /> },
    { id: "messages", label: "Messages", icon: <Icon.Chat className="h-6 w-6" /> },
    { id: "profile", label: "Profile", icon: <Icon.User className="h-6 w-6" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      {/* Top bar (desktop + mobile) */}
      {!call && (
        <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30">
                <Icon.Video className="h-5 w-5" />
              </div>
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-xl font-bold text-transparent">Streamly</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setNotifOpen(true)} className="relative rounded-full p-2.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                <Icon.Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              </button>
              <button onClick={() => setDark(!dark)} className="rounded-full p-2.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                {dark ? <Icon.Sun className="h-5 w-5" /> : <Icon.Moon className="h-5 w-5" />}
              </button>
              <button onClick={() => setTab("profile")} className="ml-1"><Avatar user={me} size="sm" showStatus /></button>
            </div>
          </div>
        </header>
      )}

      {/* Desktop side nav */}
      {!call && (
        <nav className="fixed left-0 top-16 z-20 hidden h-[calc(100vh-4rem)] w-20 flex-col items-center gap-2 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 lg:flex xl:w-56 xl:items-stretch xl:px-3">
          {navItems.map((n) => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className={cn("flex items-center justify-center gap-3 rounded-2xl p-3 font-medium transition xl:justify-start xl:px-4",
                tab === n.id ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}>
              {n.icon}<span className="hidden xl:inline">{n.label}</span>
            </button>
          ))}
          <button onClick={() => openLobby("broadcast")}
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 p-3 font-semibold text-white transition hover:opacity-90 xl:px-4">
            <Icon.Video className="h-6 w-6" /><span className="hidden xl:inline">Go Live</span>
          </button>
        </nav>
      )}

      {/* Main content */}
      <main className={cn(!call && "lg:pl-20 xl:pl-56")}>
        {tab === "discover" && <Discover onWatch={(s) => startCall("watch", s)} onGoLive={openLobby} />}
        {tab === "feed" && <Feed onGoLive={() => openLobby("broadcast")} />}
        {tab === "messages" && <Messages onCall={(audioOnly) => { if (audioOnly) { setCamOn(false); } else { setCamOn(true); } startCall("group"); }} />}
        {tab === "profile" && <Profile dark={dark} onToggleDark={() => setDark(!dark)} onOpenSettings={() => setSettingsOpen(true)} />}
      </main>

      {/* Mobile bottom nav */}
      {!call && (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 px-2 py-2 backdrop-blur-xl lg:hidden">
          {navItems.slice(0, 2).map((n) => (
            <NavBtn key={n.id} n={n} active={tab === n.id} onClick={() => setTab(n.id)} />
          ))}
          <button onClick={() => openLobby("broadcast")} className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/40 transition active:scale-90">
            <Icon.Video className="h-7 w-7" />
          </button>
          {navItems.slice(2).map((n) => (
            <NavBtn key={n.id} n={n} active={tab === n.id} onClick={() => setTab(n.id)} />
          ))}
        </nav>
      )}

      {/* Call room */}
      {call && (
        <CallRoom
          stream={call.stream}
          mode={call.mode}
          onLeave={() => setCall(null)}
          onOpenSettings={() => setSettingsOpen(true)}
          onInvite={() => setInviteOpen(true)}
          camOn={camOn} micOn={micOn} facing={facing}
          setCamOn={setCamOn} setMicOn={setMicOn}
          toggleFacing={() => setFacing((f) => f === "user" ? "environment" : "user")}
        />
      )}

      {/* Incoming call — only show when not already in a call */}
      {incoming && !call && !lobby && (
        <IncomingCall
          onAccept={() => { setIncoming(false); startCall("group"); }}
          onDecline={() => setIncoming(false)}
        />
      )}

      {/* Pre-join lobby / device check */}
      {lobby && (
        <PreJoin
          mode={lobby.mode}
          camOn={camOn} micOn={micOn} facing={facing}
          setCamOn={setCamOn} setMicOn={setMicOn}
          toggleFacing={() => setFacing((f) => f === "user" ? "environment" : "user")}
          onCancel={() => setLobby(null)}
          onStart={launchFromLobby}
        />
      )}

      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)}
        camOn={camOn} micOn={micOn} facing={facing}
        setCamOn={setCamOn} setMicOn={setMicOn} setFacing={setFacing} />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

function NavBtn({ n, active, onClick }: { n: { label: string; icon: React.ReactNode }; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition",
      active ? "text-violet-600 dark:text-violet-300" : "text-slate-400")}>
      {n.icon}{n.label}
    </button>
  );
}
