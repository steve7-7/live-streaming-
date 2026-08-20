import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AppNotification,
  Conversation,
  DirectMessage,
  FeedComment,
  FeedPost,
  Stream,
  User,
} from "../types";
import { api } from "./api";

// ── Queries ──────────────────────────────────────────────────────────────

export const useStreams = (filter: { category?: string; q?: string } = {}) =>
  useQuery({
    queryKey: ["streams", filter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filter.category && filter.category !== "All") params.set("category", filter.category);
      if (filter.q) params.set("q", filter.q);
      const qs = params.toString();
      return api.get<{ streams: Stream[] }>(`/streams${qs ? `?${qs}` : ""}`).then((r) => r.streams);
    },
  });

export const useMyStreams = () =>
  useQuery({
    queryKey: ["me-streams"],
    queryFn: () => api.get<{ streams: Stream[] }>("/streams/mine").then((r) => r.streams),
  });

export const useFeed = () =>
  useQuery({
    queryKey: ["feed"],
    queryFn: () => api.get<{ posts: FeedPost[] }>("/feed").then((r) => r.posts),
  });

export const useUsers = () =>
  useQuery({
    queryKey: ["users"],
    queryFn: () =>
      api.get<{ users: (User & { isFollowing: boolean })[] }>("/users").then((r) => r.users),
  });

export const useMeStats = () =>
  useQuery({
    queryKey: ["me-stats"],
    queryFn: () =>
      api
        .get<{ user: User; stats: { following: number; streams: number } }>("/me")
        .then((r) => r.stats),
  });

export const useConversations = () =>
  useQuery({
    queryKey: ["conversations"],
    queryFn: () =>
      api.get<{ conversations: Conversation[] }>("/conversations").then((r) => r.conversations),
  });

export const useThread = (conversationId: string | null) =>
  useQuery({
    queryKey: ["thread", conversationId],
    queryFn: () =>
      api
        .get<{ messages: DirectMessage[] }>(`/conversations/${conversationId}/messages`)
        .then((r) => r.messages),
    enabled: !!conversationId,
  });

export const useNotifications = () =>
  useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      api.get<{ notifications: AppNotification[] }>("/notifications").then((r) => r.notifications),
  });

// ── Mutations ────────────────────────────────────────────────────────────

export const useLikePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => api.post(`/posts/${postId}/like`),
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: ["feed"] });
      const prev = qc.getQueryData<FeedPost[]>(["feed"]);
      qc.setQueryData<FeedPost[]>(["feed"], (old) =>
        old?.map((p) =>
          p.id === postId
            ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
            : p
        )
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(["feed"], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["feed"] }),
  });
};

export const useAddComment = () =>
  useMutation({
    mutationFn: ({ postId, text }: { postId: string; text: string }) =>
      api
        .post<{ comment: FeedComment }>(`/posts/${postId}/comments`, { text })
        .then((r) => r.comment),
  });

export const useLikeComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      api.post<{ liked: boolean; likes: number }>(`/comments/${commentId}/like`),
    onSettled: () => qc.invalidateQueries({ queryKey: ["feed"] }),
  });
};

export const useToggleFollow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/follow`),
    onMutate: async (userId) => {
      await qc.cancelQueries({ queryKey: ["feed"] });
      const prev = qc.getQueryData<FeedPost[]>(["feed"]);
      qc.setQueryData<FeedPost[]>(["feed"], (old) =>
        old?.map((p) => (p.user.id === userId ? { ...p, authorFollowed: !p.authorFollowed } : p))
      );
      qc.setQueryData<(User & { isFollowing: boolean })[]>(["users"], (old) =>
        old?.map((u) => (u.id === userId ? { ...u, isFollowing: !u.isFollowing } : u))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(["feed"], ctx?.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["me-stats"] });
    },
  });
};

export const useSendMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, text }: { conversationId: string; text: string }) =>
      api
        .post<{ message: DirectMessage }>(`/conversations/${conversationId}/messages`, { text })
        .then((r) => r.message),
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["thread", v.conversationId] });
    },
  });
};

export const useUpdateMe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { name?: string; bio?: string; avatar?: string }) =>
      api.patch<{ user: User }>("/me", patch).then((r) => r.user),
    onSettled: () => qc.invalidateQueries({ queryKey: ["me-stats"] }),
  });
};
