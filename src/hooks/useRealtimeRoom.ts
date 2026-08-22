import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { config } from "../config";
import type { ChatMessage, Reaction } from "../types";
import { authStorage } from "../lib/authStorage";

export function useRealtimeRoom(streamId: string) {
  const enabled = config.enableRealtime;
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [viewers, setViewers] = useState(0);
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
    socket.on("reaction", (reaction: Reaction) => {
      setReactions((current) => [...current, reaction]);
      const timer = window.setTimeout(() => {
        setReactions((current) => current.filter((item) => item.id !== reaction.id));
        timers.delete(timer);
      }, 3_000);
      timers.add(timer);
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
    sendMessage: (text: string) => socketRef.current?.emit("chat.send", { streamId, text }),
    sendReaction: (emoji: string) => socketRef.current?.emit("reaction.send", { streamId, emoji }),
  };
}
