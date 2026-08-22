import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { config } from "../config";
import type { ChatMessage, Reaction, User } from "../types";
import { authStorage } from "../lib/authStorage";

interface RealtimeGift {
  id: string;
  user: User;
  gift: { id: string; name: string; emoji: string; coins: number };
  time: string;
}

export function useRealtimeRoom(streamId: string) {
  const enabled = config.enableRealtime;
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [viewers, setViewers] = useState(0);
  const [latestGift, setLatestGift] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;
    const socket = io(config.wsUrl || undefined, {
      path: "/socket.io",
      auth: { token: authStorage.accessToken() },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    const timers = new Set<number>();

    socket.on("connect", () => {
      setConnected(true);
      setError("");
      socket.emit("room.join", { streamId });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (cause) => {
      setConnected(false);
      setError(cause.message || "Realtime connection failed");
    });
    socket.on("room.error", (message: string) => setError(message));
    socket.on("room.presence", (count: number) => setViewers(count));
    socket.on("chat.history", (history: ChatMessage[]) => setMessages(history));
    socket.on("chat.message", (message: ChatMessage) =>
      setMessages((current) => [...current.slice(-99), message])
    );
    socket.on("room.system", (message: ChatMessage) =>
      setMessages((current) => [...current.slice(-99), message])
    );
    socket.on("reaction", (reaction: Reaction) => {
      setReactions((current) => [...current, reaction]);
      const timer = window.setTimeout(() => {
        setReactions((current) => current.filter((item) => item.id !== reaction.id));
        timers.delete(timer);
      }, 3_000);
      timers.add(timer);
    });
    socket.on("gift", (event: RealtimeGift) => {
      setMessages((current) => [
        ...current.slice(-99),
        {
          id: event.id,
          user: event.user,
          text: `sent a ${event.gift.name} ${event.gift.emoji}`,
          time: event.time,
          system: true,
        },
      ]);
      setLatestGift(`${event.user.name} sent a ${event.gift.name} ${event.gift.emoji}`);
      const toastTimer = window.setTimeout(() => {
        setLatestGift("");
        timers.delete(toastTimer);
      }, 2_500);
      timers.add(toastTimer);
      for (let index = 0; index < 5; index += 1) {
        const reaction: Reaction = {
          id: `${event.id}-${index}`,
          emoji: event.gift.emoji,
          x: 10 + Math.random() * 75,
        };
        const addTimer = window.setTimeout(() => {
          setReactions((current) => [...current, reaction]);
          const removeTimer = window.setTimeout(() => {
            setReactions((current) => current.filter((item) => item.id !== reaction.id));
            timers.delete(removeTimer);
          }, 3_000);
          timers.add(removeTimer);
          timers.delete(addTimer);
        }, index * 120);
        timers.add(addTimer);
      }
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      socketRef.current = null;
      socket.disconnect();
    };
  }, [enabled, streamId]);

  return {
    enabled,
    connected,
    error,
    messages,
    reactions,
    viewers,
    latestGift,
    sendMessage: (text: string) => socketRef.current?.emit("chat.send", { streamId, text }),
    sendReaction: (emoji: string) => socketRef.current?.emit("reaction.send", { streamId, emoji }),
    sendGift: (giftId: string) => socketRef.current?.emit("gift.send", { streamId, giftId }),
  };
}
