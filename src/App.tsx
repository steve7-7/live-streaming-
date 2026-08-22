import { useEffect, useState, type ReactNode } from "react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import type { Stream } from "./types";
import { me } from "./data";
import { Icon } from "./components/Icons";
import Avatar from "./components/Avatar";
import Discover from "./views/Discover";
import Feed from "./views/Feed";
import Messages from "./views/Messages";
import Profile from "./views/Profile";
import PublicProfile from "./views/PublicProfile";
import CallRoom from "./components/CallRoom";
import SettingsPanel from "./components/SettingsPanel";
import InviteModal from "./components/InviteModal";
import IncomingCall from "./components/IncomingCall";
import PreJoin from "./components/PreJoin";
import NotificationsPanel from "./components/NotificationsPanel";
import { track } from "./lib/analytics";
import { cn } from "./utils/cn";
import { useStream } from "./hooks/useData";
import { useAuth } from "./auth/AuthContext";
import AuthScreen from "./auth/AuthScreen";
import { config } from "./config";

type Tab = "discover" | "feed" | "messages" | "profile";

const TAB_ROUTES: Record<Tab, string> = {
  discover: "/",
  feed: "/feed",
  messages: "/messages",
  profile: "/profile",
};

function makeCallStream(host: typeof me, title = "Group Call", category = "Call"): Stream {
  return {
    id: "group",
    title,
    host,
    category,
    thumbnail: "",
    viewers: 5,
    live: true,
    tags: [],
  };
}

export default function App() {
  const { user, logout } = useAuth();
  const currentUser = user ?? me;
  const navigate = useNavigate();
  const location = useLocation();
  const inCall = location.pathname.startsWith("/live");
  const authPage = location.pathname === "/login";
  const hideShell = inCall || authPage;

  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [incoming, setIncoming] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [lobby, setLobby] = useState<null | { mode: "broadcast" | "group" }>(null);

  // media device state — shared across call & settings
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [facing, setFacing] = useState<"user" | "environment">("user");

  // Apply and persist theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // Simulate an incoming call once after initial mount, not on re-renders
  useEffect(() => {
    const t = setTimeout(() => setIncoming(true), 14000);
    return () => clearTimeout(t);
  }, []);

  const openLobby = (mode: "broadcast" | "group") => {
    if (!user) {
      navigate("/login?next=/");
      return;
    }
    setLobby({ mode });
  };

  const launchFromLobby = (title: string, category: string) => {
    if (!lobby) return;
    const mode = lobby.mode;
    setLobby(null);
    track("stream_start", { mode, category });
    navigate(
      mode === "broadcast"
        ? `/live/broadcast?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`
        : "/live/group"
    );
  };

  const watch = (s: Stream) => {
    track("watch_stream", { id: s.id });
    navigate(`/live/${s.id}`);
  };

  const startGroupCall = (audioOnly: boolean) => {
    setCamOn(!audioOnly);
    track("call_start", { audioOnly });
    navigate("/live/group");
  };

  const leaveCall = () => {
    track("call_leave");
    // location.key === "default" means the user landed directly on /live/...
    if (location.key === "default") navigate("/", { replace: true });
    else navigate(-1);
  };

  const navItems: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: "discover", label: "Discover", icon: <Icon.Compass className="h-6 w-6" /> },
    { id: "feed", label: "Feed", icon: <Icon.Home className="h-6 w-6" /> },
    { id: "messages", label: "Messages", icon: <Icon.Chat className="h-6 w-6" /> },
    { id: "profile", label: "Profile", icon: <Icon.User className="h-6 w-6" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      {/* Top bar (desktop + mobile) */}
      {!hideShell && (
        <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30">
                <Icon.Video className="h-5 w-5" />
              </div>
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-xl font-bold text-transparent">
                Streamly
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setNotifOpen(true)}
                className="relative rounded-full p-2.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Open notifications"
              >
                <Icon.Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              </button>
              <button
                onClick={() => setDark(!dark)}
                className="rounded-full p-2.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle dark mode"
              >
                {dark ? <Icon.Sun className="h-5 w-5" /> : <Icon.Moon className="h-5 w-5" />}
              </button>
              {user ? (
                <button
                  onClick={() => navigate(TAB_ROUTES.profile)}
                  className="ml-1"
                  aria-label="Open your profile"
                >
                  <Avatar user={currentUser} size="sm" showStatus />
                </button>
              ) : (
                <button
                  onClick={() => navigate("/login")}
                  className="ml-2 rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-600"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Desktop side nav */}
      {!hideShell && (
        <nav className="fixed left-0 top-16 z-20 hidden h-[calc(100vh-4rem)] w-20 flex-col items-center gap-2 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 lg:flex xl:w-56 xl:items-stretch xl:px-3">
          {navItems.map((n) => (
            <NavLink
              key={n.id}
              to={TAB_ROUTES[n.id]}
              end={n.id === "discover"}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-center gap-3 rounded-2xl p-3 font-medium transition xl:justify-start xl:px-4",
                  isActive
                    ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                )
              }
            >
              {n.icon}
              <span className="hidden xl:inline">{n.label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => openLobby("broadcast")}
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 p-3 font-semibold text-white transition hover:opacity-90 xl:px-4"
          >
            <Icon.Video className="h-6 w-6" />
            <span className="hidden xl:inline">Go Live</span>
          </button>
        </nav>
      )}

      {/* Main content */}
      <main className={cn(!hideShell && "lg:pl-20 xl:pl-56")}>
        <Routes>
          <Route path="/" element={<Discover onWatch={watch} onGoLive={openLobby} />} />
          <Route path="/feed" element={<Feed onGoLive={() => openLobby("broadcast")} />} />
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/" replace />
              ) : (
                <AuthScreen
                  onAuthenticated={() =>
                    navigate(new URLSearchParams(location.search).get("next") || "/", {
                      replace: true,
                    })
                  }
                />
              )
            }
          />
          <Route
            path="/messages"
            element={
              user ? (
                <Messages onCall={startGroupCall} />
              ) : (
                <Navigate to="/login?next=/messages" replace />
              )
            }
          />
          <Route
            path="/profile"
            element={
              user ? (
                <Profile
                  dark={dark}
                  onToggleDark={() => setDark(!dark)}
                  onOpenSettings={() => setSettingsOpen(true)}
                />
              ) : (
                <Navigate to="/login?next=/profile" replace />
              )
            }
          />
          <Route path="/u/:handle" element={<PublicProfile onWatch={watch} />} />
          <Route
            path="/live/:id"
            element={
              <LiveCall
                currentUser={currentUser}
                onLeave={leaveCall}
                onOpenSettings={() => setSettingsOpen(true)}
                onInvite={() => setInviteOpen(true)}
                camOn={camOn}
                micOn={micOn}
                facing={facing}
                setCamOn={setCamOn}
                setMicOn={setMicOn}
                toggleFacing={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Mobile bottom nav */}
      {!hideShell && (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 px-2 py-2 backdrop-blur-xl lg:hidden">
          {navItems.slice(0, 2).map((n) => (
            <NavBtn key={n.id} n={n} to={TAB_ROUTES[n.id]} exact={n.id === "discover"} />
          ))}
          <button
            onClick={() => openLobby("broadcast")}
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/40 transition active:scale-90"
            aria-label="Go live"
          >
            <Icon.Video className="h-7 w-7" />
          </button>
          {navItems.slice(2).map((n) => (
            <NavBtn key={n.id} n={n} to={TAB_ROUTES[n.id]} exact={n.id === "discover"} />
          ))}
        </nav>
      )}

      {/* Incoming call — only show when not already in a call */}
      {incoming && !hideShell && !lobby && (
        <IncomingCall
          onAccept={() => {
            setIncoming(false);
            track("call_accept");
            navigate("/live/group");
          }}
          onDecline={() => setIncoming(false)}
        />
      )}

      {/* Pre-join lobby / device check */}
      {lobby && (
        <PreJoin
          mode={lobby.mode}
          camOn={camOn}
          micOn={micOn}
          facing={facing}
          setCamOn={setCamOn}
          setMicOn={setMicOn}
          toggleFacing={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          onCancel={() => setLobby(null)}
          onStart={launchFromLobby}
        />
      )}

      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={
          config.enableApi
            ? () => {
                setSettingsOpen(false);
                void logout();
              }
            : undefined
        }
        camOn={camOn}
        micOn={micOn}
        facing={facing}
        setCamOn={setCamOn}
        setMicOn={setMicOn}
        setFacing={setFacing}
      />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

/** Resolves `/live/:id` into the matching call room. */
function LiveCall({
  currentUser,
  onLeave,
  onOpenSettings,
  onInvite,
  camOn,
  micOn,
  facing,
  setCamOn,
  setMicOn,
  toggleFacing,
}: {
  currentUser: typeof me;
  onLeave: () => void;
  onOpenSettings: () => void;
  onInvite: () => void;
  camOn: boolean;
  micOn: boolean;
  facing: "user" | "environment";
  setCamOn: (v: boolean) => void;
  setMicOn: (v: boolean) => void;
  toggleFacing: () => void;
}) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isLocalRoom = id === "broadcast" || id === "group";
  const { data: remoteStream, isPending, isError } = useStream(isLocalRoom ? undefined : id);

  let mode: "watch" | "broadcast" | "group" = "watch";
  let stream: Stream | null = null;
  if (id === "broadcast") {
    mode = "broadcast";
    stream = makeCallStream(
      currentUser,
      searchParams.get("title") || "Your Broadcast",
      searchParams.get("category") || "Call"
    );
  } else if (id === "group") {
    mode = "group";
    stream = makeCallStream(currentUser);
  } else {
    stream = remoteStream ?? null;
  }

  if (!isLocalRoom && isPending) {
    return <div className="shimmer min-h-screen bg-slate-950" aria-label="Loading stream" />;
  }
  if (!stream || isError) return <Navigate to="/" replace />;

  return (
    <CallRoom
      stream={stream}
      mode={mode}
      onLeave={onLeave}
      onOpenSettings={onOpenSettings}
      onInvite={onInvite}
      camOn={camOn}
      micOn={micOn}
      facing={facing}
      setCamOn={setCamOn}
      setMicOn={setMicOn}
      toggleFacing={toggleFacing}
    />
  );
}

function NavBtn({
  n,
  to,
  exact,
}: {
  n: { label: string; icon: ReactNode };
  to: string;
  exact?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        cn(
          "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition",
          isActive ? "text-violet-600 dark:text-violet-300" : "text-slate-400"
        )
      }
    >
      {n.icon}
      {n.label}
    </NavLink>
  );
}
