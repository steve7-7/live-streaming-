import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "../types";
import { api, tokenStore } from "./api";

interface RegisterInput {
  name: string;
  handle: string;
  email: string;
  password: string;
}

interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: User | null;
  status: "loading" | "authed" | "anon";
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  setUser: (u: User) => void;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");

  // Bootstrap session from stored tokens (refresh if the access token expired)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokenStore.access && !tokenStore.refresh) {
        if (!cancelled) setStatus("anon");
        return;
      }
      try {
        const { user } = await api.get<{ user: User }>("/me");
        if (!cancelled) {
          setUser(user);
          setStatus("authed");
        }
      } catch {
        tokenStore.clear();
        if (!cancelled) setStatus("anon");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applySession = (s: Session) => {
    tokenStore.set(s);
    setUser(s.user);
    setStatus("authed");
  };

  const login = useCallback(async (email: string, password: string) => {
    applySession(await api.post<Session>("/auth/login", { email, password }));
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    applySession(await api.post<Session>("/auth/register", input));
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus("anon");
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout, setUser }),
    [user, status, login, register, logout]
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
