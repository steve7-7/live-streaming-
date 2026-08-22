import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { config } from "../config";
import { me } from "../data";
import { queryKeys } from "../hooks/useData";
import { api, type AuthResponse } from "../lib/api";
import { AUTH_EXPIRED_EVENT, authStorage } from "../lib/authStorage";
import { queryClient } from "../lib/queryClient";
import type { User } from "../types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    name: string;
    handle: string;
    email: string;
    password: string;
  }) => Promise<void>;
  updateProfile: (input: { name?: string; handle?: string; avatar?: string }) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    !config.enableApi ? "authenticated" : authStorage.hasSession() ? "loading" : "unauthenticated"
  );
  const [user, setUser] = useState<User | null>(config.enableApi ? null : me);

  const acceptSession = useCallback((session: AuthResponse) => {
    authStorage.save(session);
    setUser(session.user);
    setStatus("authenticated");
    queryClient.setQueryData(queryKeys.session, session.user);
  }, []);

  const expireSession = useCallback(() => {
    authStorage.clear();
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, []);

  useEffect(() => {
    if (!config.enableApi) return;
    window.addEventListener(AUTH_EXPIRED_EVENT, expireSession);
    let cancelled = false;

    if (authStorage.hasSession()) {
      api
        .session()
        .then((sessionUser) => {
          if (cancelled) return;
          setUser(sessionUser);
          setStatus("authenticated");
          queryClient.setQueryData(queryKeys.session, sessionUser);
        })
        .catch(() => {
          if (!cancelled) expireSession();
        });
    }

    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_EXPIRED_EVENT, expireSession);
    };
  }, [expireSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login: async (email, password) => acceptSession(await api.login(email, password)),
      register: async (input) => acceptSession(await api.register(input)),
      updateProfile: async (input) => {
        const updated = config.enableApi
          ? await api.updateProfile(input)
          : {
              ...(user ?? me),
              ...input,
              handle: input.handle
                ? `@${input.handle.replace(/^@/, "").toLowerCase()}`
                : (user ?? me).handle,
            };
        setUser(updated);
        queryClient.setQueryData(queryKeys.session, updated);
        return updated;
      },
      logout: async () => {
        const refreshToken = authStorage.refreshToken();
        try {
          await api.logout(refreshToken);
        } finally {
          expireSession();
        }
      },
    }),
    [acceptSession, expireSession, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
