import type { FastifyInstance } from "fastify";
import { Server } from "socket.io";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, row, rows, type Row } from "./db";
import { relativeTime, userDto } from "./dto";

const roomInput = z.object({
  streamId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/),
});
const chatInput = roomInput.extend({ text: z.string().trim().min(1).max(500) });
const reactionInput = roomInput.extend({ emoji: z.string().min(1).max(16) });
type JwtPayload = { sub: string; type: "access" | "refresh" };

const messageDto = (record: Row) => ({
  id: String(record.id),
  user: record.user_id
    ? userDto({
        id: record.user_id,
        name: record.name,
        handle: record.handle,
        avatar: record.avatar,
        color: record.color,
        status: record.status,
        followers: record.followers,
      })
    : {
        id: String(record.guest_id ?? `guest-${record.id}`),
        name: String(record.guest_name ?? "Guest"),
        handle: "@guest",
        avatar: "",
        color: "#94a3b8",
        status: "online" as const,
        followers: 0,
      },
  text: String(record.text),
  time: relativeTime(record.created_at),
});

export function registerRealtime(app: FastifyInstance) {
  const io = new Server(app.server, {
    path: "/socket.io",
    cors: {
      origin: process.env.CLIENT_ORIGIN?.split(",") ?? true,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token =
      typeof socket.handshake.auth.token === "string" ? socket.handshake.auth.token : "";
    if (!token) return next();
    try {
      const payload = app.jwt.verify<JwtPayload>(token);
      if (payload.type === "access") socket.data.userId = payload.sub;
    } catch {
      // An expired token joins as a guest; protected HTTP calls still require a valid token.
    }
    next();
  });

  const emitPresence = (streamId: string) => {
    io.to(`stream:${streamId}`).emit(
      "room.presence",
      io.sockets.adapter.rooms.get(`stream:${streamId}`)?.size ?? 0
    );
  };

  io.on("connection", (socket) => {
    const joined = new Set<string>();
    const guestId = `guest-${randomUUID()}`;
    const guestName = `Guest ${guestId.slice(-4)}`;
    const sentAt: number[] = [];

    socket.on("room.join", (input: unknown) => {
      const parsed = roomInput.safeParse(input);
      if (!parsed.success) return;
      const { streamId } = parsed.data;
      const exists =
        ["broadcast", "group"].includes(streamId) ||
        Boolean(row("SELECT 1 ok FROM streams WHERE id = ?", streamId));
      if (!exists) return socket.emit("room.error", "Stream not found");

      const roomName = `stream:${streamId}`;
      void socket.join(roomName);
      joined.add(streamId);
      const history = rows(
        `SELECT m.*, u.name, u.handle, u.avatar, u.color, u.status,
          (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) followers
         FROM live_messages m LEFT JOIN users u ON u.id = m.user_id
         WHERE m.stream_id = ? ORDER BY m.created_at DESC LIMIT 50`,
        streamId
      )
        .reverse()
        .map(messageDto);
      socket.emit("chat.history", history);
      emitPresence(streamId);
    });

    socket.on("chat.send", (input: unknown) => {
      const parsed = chatInput.safeParse(input);
      if (!parsed.success || !joined.has(parsed.data.streamId)) return;
      const now = Date.now();
      sentAt.push(now);
      while (sentAt[0] < now - 10_000) sentAt.shift();
      if (sentAt.length > 5)
        return socket.emit("room.error", "You're sending messages too quickly");

      const id = randomUUID();
      const userId = typeof socket.data.userId === "string" ? socket.data.userId : null;
      db.prepare(
        "INSERT INTO live_messages (id, stream_id, user_id, guest_name, text) VALUES (?, ?, ?, ?, ?)"
      ).run(id, parsed.data.streamId, userId, userId ? null : guestName, parsed.data.text);
      const message = row(
        `SELECT m.*, u.name, u.handle, u.avatar, u.color, u.status,
          (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) followers
         FROM live_messages m LEFT JOIN users u ON u.id = m.user_id WHERE m.id = ?`,
        id
      )!;
      io.to(`stream:${parsed.data.streamId}`).emit("chat.message", messageDto(message));
    });

    socket.on("reaction.send", (input: unknown) => {
      const parsed = reactionInput.safeParse(input);
      if (!parsed.success || !joined.has(parsed.data.streamId)) return;
      io.to(`stream:${parsed.data.streamId}`).emit("reaction", {
        id: randomUUID(),
        emoji: parsed.data.emoji,
        x: 5 + Math.random() * 80,
      });
    });

    socket.on("disconnecting", () => {
      joined.forEach((streamId) => {
        const roomName = `stream:${streamId}`;
        const current = io.sockets.adapter.rooms.get(roomName)?.size ?? 1;
        socket.to(roomName).emit("room.presence", Math.max(0, current - 1));
      });
    });
  });

  app.addHook("onClose", () => io.close());
  return io;
}
