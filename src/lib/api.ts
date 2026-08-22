import { config } from "../config";
import type { Conversation, DirectMessage, FeedComment, FeedPost, Stream, User } from "../types";
import { AUTH_EXPIRED_EVENT, authStorage, type StoredTokens } from "./authStorage";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface AuthResponse extends StoredTokens {
  user: User;
}

export interface ProfileStats {
  followers: number;
  following: number;
  streams: number;
}

export interface PublicProfile {
  user: User;
  stats: ProfileStats;
  streams: Stream[];
  following: boolean;
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = authStorage.refreshToken();
  if (!refreshToken) return false;
  if (refreshPromise) return refreshPromise;

  refreshPromise = fetch(`${config.apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (response) => {
      if (!response.ok) return false;
      authStorage.save((await response.json()) as StoredTokens);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });

  const refreshed = await refreshPromise;
  if (!refreshed) {
    authStorage.clear();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
  return refreshed;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  canRefresh = true
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), config.apiTimeoutMs);
  const token = authStorage.accessToken();

  try {
    const response = await fetch(`${config.apiUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (response.status === 401 && canRefresh && !path.startsWith("/auth/")) {
      if (await refreshAccessToken()) return request<T>(path, options, false);
    }

    if (!response.ok) {
      const details = await response.json().catch(() => undefined);
      const message =
        typeof details === "object" && details && "message" in details
          ? String(details.message)
          : `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, details);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The API request timed out", 408);
    }
    throw new ApiError(error instanceof Error ? error.message : "Unable to reach the API", 0);
  } finally {
    window.clearTimeout(timeout);
  }
}

const params = (values: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => value && search.set(key, value));
  const query = search.toString();
  return query ? `?${query}` : "";
};

/** Typed REST contract. DTOs intentionally reuse the domain models in types.ts. */
export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: { email, password } }, false),
  register: (input: { name: string; handle: string; email: string; password: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: input }, false),
  logout: (refreshToken: string | null) =>
    request<void>("/auth/logout", { method: "POST", body: { refreshToken } }, false),
  session: () => request<User>("/me"),
  updateProfile: (input: { name?: string; handle?: string; avatar?: string }) =>
    request<User>("/me", { method: "PATCH", body: input }),
  followers: () => request<User[]>("/me/followers"),
  profileStats: () => request<ProfileStats>("/me/stats"),
  publicProfile: (handle: string) =>
    request<PublicProfile>(`/users/${encodeURIComponent(handle.replace(/^@/, ""))}`),
  streams: (filters: { category?: string; q?: string } = {}) =>
    request<Stream[]>(`/streams${params(filters)}`),
  stream: (id: string) => request<Stream>(`/streams/${encodeURIComponent(id)}`),
  feed: () => request<FeedPost[]>("/feed"),
  conversations: () => request<Conversation[]>("/conversations"),
  messages: (conversationId: string) =>
    request<DirectMessage[]>(`/conversations/${encodeURIComponent(conversationId)}/messages`),
  sendMessage: (conversationId: string, text: string) =>
    request<DirectMessage>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: "POST",
      body: { text },
    }),
  addComment: (postId: string, text: string) =>
    request<FeedComment>(`/posts/${encodeURIComponent(postId)}/comments`, {
      method: "POST",
      body: { text },
    }),
  setPostLike: (postId: string, liked: boolean) =>
    request<void>(`/posts/${encodeURIComponent(postId)}/like`, {
      method: liked ? "POST" : "DELETE",
    }),
  setFollow: (userId: string, following: boolean) =>
    request<void>(`/follows/${encodeURIComponent(userId)}`, {
      method: following ? "POST" : "DELETE",
    }),
};
