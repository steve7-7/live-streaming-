import { useQuery } from "@tanstack/react-query";
import { config } from "../config";
import { conversations, dmThreads, feedPosts, me, streams, users } from "../data";
import { api, type PublicProfile } from "../lib/api";
import { authStorage } from "../lib/authStorage";

export interface StreamFilters {
  category?: string;
  q?: string;
}

const demoStreams = ({ category, q }: StreamFilters) => {
  const term = q?.trim().toLowerCase();
  return streams.filter(
    (stream) =>
      (!category || category === "All" || stream.category === category) &&
      (!term ||
        stream.title.toLowerCase().includes(term) ||
        stream.host.name.toLowerCase().includes(term))
  );
};

export const queryKeys = {
  session: ["session"] as const,
  followers: ["followers"] as const,
  profileStats: ["profile-stats"] as const,
  publicProfile: (handle: string) => ["public-profile", handle] as const,
  streams: (filters: StreamFilters = {}) => ["streams", filters] as const,
  stream: (id: string) => ["stream", id] as const,
  feed: ["feed"] as const,
  conversations: ["conversations"] as const,
  messages: (conversationId: string) => ["messages", conversationId] as const,
};

/**
 * Query hooks are the only production-facing data imports. Fixtures are supplied as
 * initial data while VITE_ENABLE_API is false, preserving the offline demo and tests.
 */
export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: api.session,
    initialData: config.enableApi ? undefined : me,
    enabled: config.enableApi && authStorage.hasSession(),
  });
}

export function useFollowers() {
  return useQuery({
    queryKey: queryKeys.followers,
    queryFn: api.followers,
    initialData: config.enableApi ? undefined : users,
    enabled: config.enableApi,
  });
}

export function useProfileStats() {
  return useQuery({
    queryKey: queryKeys.profileStats,
    queryFn: api.profileStats,
    initialData: config.enableApi
      ? undefined
      : { followers: me.followers, following: 348, streams: 27 },
    enabled: config.enableApi,
  });
}

export function usePublicProfile(handle: string) {
  const normalized = `@${handle.replace(/^@/, "").toLowerCase()}`;
  const fixtureUser = users.find((user) => user.handle.toLowerCase() === normalized);
  const fixtureStreams = fixtureUser
    ? streams.filter((stream) => stream.host.id === fixtureUser.id)
    : [];
  const fixtureProfile: PublicProfile | null = fixtureUser
    ? {
        user: fixtureUser,
        stats: {
          followers: fixtureUser.followers,
          following: 0,
          streams: fixtureStreams.length,
        },
        streams: fixtureStreams,
        following: false,
      }
    : null;

  return useQuery<PublicProfile | null>({
    queryKey: queryKeys.publicProfile(normalized),
    queryFn: () => api.publicProfile(normalized),
    initialData: config.enableApi ? undefined : fixtureProfile,
    enabled: config.enableApi,
  });
}

export function useStreams(filters: StreamFilters = {}) {
  return useQuery({
    queryKey: queryKeys.streams(filters),
    queryFn: () => api.streams(filters),
    initialData: config.enableApi ? undefined : demoStreams(filters),
    enabled: config.enableApi,
  });
}

export function useStream(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.stream(id ?? ""),
    queryFn: () => api.stream(id!),
    initialData: config.enableApi ? undefined : streams.find((stream) => stream.id === id),
    enabled: config.enableApi && Boolean(id),
  });
}

export function useFeed() {
  return useQuery({
    queryKey: queryKeys.feed,
    queryFn: api.feed,
    initialData: config.enableApi ? undefined : feedPosts,
    enabled: config.enableApi,
  });
}

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: api.conversations,
    initialData: config.enableApi ? undefined : conversations,
    enabled: config.enableApi,
  });
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.messages(conversationId ?? ""),
    queryFn: () => api.messages(conversationId!),
    initialData:
      config.enableApi || !conversationId ? undefined : (dmThreads[conversationId] ?? []),
    enabled: config.enableApi && Boolean(conversationId),
  });
}
