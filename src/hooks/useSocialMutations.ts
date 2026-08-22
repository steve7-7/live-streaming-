import { useMutation, useQueryClient } from "@tanstack/react-query";
import { config } from "../config";
import { api } from "../lib/api";
import { queryKeys } from "./useData";

export function useSetPostLike() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      config.enableApi ? api.setPostLike(postId, liked) : Promise.resolve(undefined),
    onSettled: () => {
      if (config.enableApi) void client.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });
}

export function useSetFollow() {
  return useMutation({
    mutationFn: ({ userId, following }: { userId: string; following: boolean }) =>
      config.enableApi ? api.setFollow(userId, following) : Promise.resolve(),
  });
}

export function useSendMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, text }: { conversationId: string; text: string }) =>
      config.enableApi ? api.sendMessage(conversationId, text) : Promise.resolve(undefined),
    onSettled: (_data, _error, variables) => {
      if (config.enableApi) {
        void client.invalidateQueries({ queryKey: queryKeys.messages(variables.conversationId) });
        void client.invalidateQueries({ queryKey: queryKeys.conversations });
      }
    },
  });
}

export function useAddComment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, text }: { postId: string; text: string }) =>
      config.enableApi ? api.addComment(postId, text) : Promise.resolve(undefined),
    onSettled: () => {
      if (config.enableApi) void client.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });
}
