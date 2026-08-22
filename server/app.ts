import Fastify, { type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { compare, hash } from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { AccessToken } from "livekit-server-sdk";
import { db, row, rows, type Row } from "./db";
import { relativeTime, userDto } from "./dto";

const credentials = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });
const registerBody = credentials.extend({
  name: z.string().trim().min(2).max(80),
  handle: z.string().trim().min(2).max(30),
});
const textBody = z.object({ text: z.string().trim().min(1).max(2_000) });
const profileBody = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    handle: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .regex(
        /^@?[a-zA-Z0-9_.]+$/,
        "Handle can only contain letters, numbers, dots, and underscores"
      )
      .optional(),
    avatar: z.union([z.string().url(), z.literal("")]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

type AuthPayload = { sub: string; type: "access" | "refresh" };
const accessSecret = process.env.JWT_SECRET ?? "local-development-access-secret-change-me";
const refreshSecret =
  process.env.JWT_REFRESH_SECRET ?? "local-development-refresh-secret-change-me";
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const userSelect = `SELECT u.*, (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) followers`;

export async function buildApp() {
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET || !process.env.CLIENT_ORIGIN)
  ) {
    throw new Error("JWT_SECRET, JWT_REFRESH_SECRET, and CLIENT_ORIGIN are required in production");
  }
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  await app.register(cors, {
    origin: process.env.CLIENT_ORIGIN?.split(",") ?? true,
    credentials: true,
  });
  await app.register(jwt, { secret: accessSecret });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ message: "Invalid request", issues: error.issues });
    }
    const databaseError = error as { code?: string; message?: string };
    if (
      databaseError.code === "SQLITE_CONSTRAINT_UNIQUE" ||
      databaseError.message?.includes("UNIQUE constraint failed")
    ) {
      return reply.code(409).send({ message: "That email or handle is already registered" });
    }
    app.log.error(error);
    const failure = error as { statusCode?: number; message?: string };
    return reply.code(failure.statusCode ?? 500).send({
      message: failure.statusCode ? (failure.message ?? "Request failed") : "Internal server error",
    });
  });

  const requireUser = async (request: FastifyRequest) => {
    await request.jwtVerify();
    const payload = request.user as AuthPayload;
    if (payload.type !== "access") {
      throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
    }
    return payload.sub;
  };

  const optionalUser = async (request: FastifyRequest) => {
    if (!request.headers.authorization) return null;
    try {
      await request.jwtVerify();
      const payload = request.user as AuthPayload;
      return payload.type === "access" ? payload.sub : null;
    } catch {
      return null;
    }
  };

  const issueTokens = (userId: string) => {
    const accessToken = app.jwt.sign(
      { sub: userId, type: "access", jti: randomUUID() },
      { expiresIn: "15m" }
    );
    const refreshToken = app.jwt.sign(
      { sub: userId, type: "refresh", jti: randomUUID() },
      { key: refreshSecret, expiresIn: "30d" }
    );
    db.prepare(
      "INSERT INTO refresh_tokens (id, token_hash, user_id, expires_at) VALUES (?, ?, ?, ?)"
    ).run(
      randomUUID(),
      tokenHash(refreshToken),
      userId,
      new Date(Date.now() + 30 * 86_400_000).toISOString()
    );
    return { accessToken, refreshToken };
  };

  app.get("/health", () => ({ status: "ok" }));

  app.post("/live/token", async (request, reply) => {
    const input = z
      .object({
        room: z
          .string()
          .trim()
          .min(1)
          .max(128)
          .regex(/^[a-zA-Z0-9_-]+$/),
        role: z.enum(["watch", "publish"]),
      })
      .parse(request.body);
    const userId = await optionalUser(request);
    if (input.role === "publish" && !userId) {
      return reply.code(401).send({ message: "Sign in to publish media" });
    }
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      return reply.code(503).send({ message: "Live media service is not configured" });
    }

    if (input.role === "publish" && !["broadcast", "group"].includes(input.room)) {
      const owned = row(
        "SELECT 1 ok FROM streams WHERE id = ? AND host_id = ?",
        input.room,
        userId
      );
      if (!owned) return reply.code(403).send({ message: "You cannot publish to this room" });
    }

    const identity = userId ?? `guest-${randomUUID()}`;
    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: userId
        ? String(row("SELECT name FROM users WHERE id = ?", userId)?.name ?? "Creator")
        : "Guest",
      ttl: "2h",
    });
    token.addGrant({
      roomJoin: true,
      room: input.room,
      canSubscribe: true,
      canPublish: input.role === "publish",
      canPublishData: input.role === "publish",
    });
    return { token: await token.toJwt() };
  });

  app.post("/auth/register", async (request, reply) => {
    const input = registerBody.parse(request.body);
    const id = randomUUID();
    const handleValue = `@${input.handle.replace(/^@/, "").toLowerCase()}`;
    db.prepare(
      "INSERT INTO users (id, email, password_hash, name, handle, status) VALUES (?, ?, ?, ?, ?, 'online')"
    ).run(id, input.email.toLowerCase(), await hash(input.password, 12), input.name, handleValue);
    const user = row(`${userSelect} FROM users u WHERE u.id = ?`, id)!;
    return reply.code(201).send({ user: userDto(user), ...issueTokens(id) });
  });

  app.post("/auth/login", async (request, reply) => {
    const input = credentials.parse(request.body);
    const user = row(
      `${userSelect} FROM users u WHERE lower(u.email) = ?`,
      input.email.toLowerCase()
    );
    if (!user || !(await compare(input.password, String(user.password_hash)))) {
      return reply.code(401).send({ message: "Invalid email or password" });
    }
    db.prepare(
      "UPDATE users SET status = 'online', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(user.id);
    return { user: userDto({ ...user, status: "online" }), ...issueTokens(String(user.id)) };
  });

  app.post("/auth/refresh", async (request, reply) => {
    const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(request.body);
    let payload: AuthPayload;
    try {
      payload = app.jwt.verify<AuthPayload>(refreshToken, { key: refreshSecret });
    } catch {
      return reply.code(401).send({ message: "Invalid refresh token" });
    }
    const stored = row(
      "SELECT id FROM refresh_tokens WHERE token_hash = ? AND datetime(expires_at) > datetime('now')",
      tokenHash(refreshToken)
    );
    if (!stored || payload.type !== "refresh")
      return reply.code(401).send({ message: "Refresh token expired" });
    db.prepare("DELETE FROM refresh_tokens WHERE id = ?").run(stored.id);
    return issueTokens(payload.sub);
  });

  app.post("/auth/logout", { preHandler: requireUser }, async (request, reply) => {
    const { refreshToken } = z
      .object({ refreshToken: z.string().optional() })
      .parse(request.body ?? {});
    if (refreshToken)
      db.prepare("DELETE FROM refresh_tokens WHERE token_hash = ?").run(tokenHash(refreshToken));
    return reply.code(204).send();
  });

  app.get("/me", { preHandler: requireUser }, async (request, reply) => {
    const user = row(
      `${userSelect} FROM users u WHERE u.id = ?`,
      (request.user as AuthPayload).sub
    );
    return user ? userDto(user) : reply.code(404).send({ message: "User not found" });
  });

  app.patch("/me", { preHandler: requireUser }, async (request) => {
    const input = profileBody.parse(request.body);
    const userId = (request.user as AuthPayload).sub;
    const handleValue = input.handle ? `@${input.handle.replace(/^@/, "").toLowerCase()}` : null;
    db.prepare(
      `UPDATE users SET
      name = COALESCE(?, name), handle = COALESCE(?, handle), avatar = COALESCE(?, avatar),
      updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(input.name ?? null, handleValue, input.avatar ?? null, userId);
    return userDto(row(`${userSelect} FROM users u WHERE u.id = ?`, userId)!);
  });

  app.get("/me/stats", { preHandler: requireUser }, (request) => {
    const userId = (request.user as AuthPayload).sub;
    return row(
      `SELECT
        (SELECT COUNT(*) FROM follows WHERE followed_id = ?) followers,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) following,
        (SELECT COUNT(*) FROM streams WHERE host_id = ?) streams`,
      userId,
      userId,
      userId
    );
  });

  app.get("/me/followers", { preHandler: requireUser }, (request) => {
    const userId = (request.user as AuthPayload).sub;
    return rows(
      `${userSelect} FROM users u JOIN follows f ON f.follower_id = u.id
       WHERE f.followed_id = ? ORDER BY f.created_at DESC LIMIT 20`,
      userId
    ).map(userDto);
  });

  const streamFromRow = (record: Row) => ({
    id: String(record.stream_id),
    title: String(record.title),
    host: userDto({
      id: record.host_id,
      name: record.name,
      handle: record.handle,
      avatar: record.avatar,
      color: record.color,
      status: record.user_status,
      followers: record.followers,
    }),
    category: String(record.category),
    thumbnail: String(record.thumbnail),
    viewers: Number(record.viewers),
    live: record.stream_status === "live",
    tags: JSON.parse(String(record.tags)) as string[],
  });
  const streamSql = `SELECT s.id stream_id, s.*, s.status stream_status, u.id host_id, u.name, u.handle,
    u.avatar, u.color, u.status user_status,
    (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) followers
    FROM streams s JOIN users u ON u.id = s.host_id`;

  app.get("/streams", (request) => {
    const query = z
      .object({ category: z.string().optional(), q: z.string().optional() })
      .parse(request.query);
    const clauses: string[] = [];
    const values: string[] = [];
    if (query.category) {
      clauses.push("s.category = ?");
      values.push(query.category);
    }
    if (query.q) {
      clauses.push("(lower(s.title) LIKE ? OR lower(u.name) LIKE ?)");
      values.push(`%${query.q.toLowerCase()}%`, `%${query.q.toLowerCase()}%`);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    return rows(`${streamSql}${where} ORDER BY s.viewers DESC`, ...values).map(streamFromRow);
  });

  app.get("/streams/:id", (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const stream = row(`${streamSql} WHERE s.id = ?`, id);
    return stream ? streamFromRow(stream) : reply.code(404).send({ message: "Stream not found" });
  });

  app.get("/users/:handle", async (request, reply) => {
    const { handle } = z.object({ handle: z.string().min(1) }).parse(request.params);
    const normalizedHandle = `@${handle.replace(/^@/, "").toLowerCase()}`;
    const profile = row(`${userSelect} FROM users u WHERE lower(u.handle) = ?`, normalizedHandle);
    if (!profile) return reply.code(404).send({ message: "Profile not found" });

    const profileId = String(profile.id);
    const viewerId = await optionalUser(request);
    const stats = row(
      `SELECT
        (SELECT COUNT(*) FROM follows WHERE followed_id = ?) followers,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) following,
        (SELECT COUNT(*) FROM streams WHERE host_id = ?) streams`,
      profileId,
      profileId,
      profileId
    );
    const profileStreams = rows(
      `${streamSql} WHERE s.host_id = ? ORDER BY s.started_at DESC`,
      profileId
    ).map(streamFromRow);
    const following = Boolean(
      row("SELECT 1 ok FROM follows WHERE follower_id = ? AND followed_id = ?", viewerId, profileId)
    );
    return { user: userDto(profile), stats, streams: profileStreams, following };
  });

  const feedFor = (viewerId: string) =>
    rows(
      `SELECT p.*, u.name, u.handle, u.avatar, u.color, u.status,
      (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) followers,
      p.like_count likes,
      EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) liked
      FROM feed_posts p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC`,
      viewerId
    ).map((post) => ({
      id: String(post.id),
      user: userDto({ ...post, id: post.user_id }),
      caption: String(post.caption),
      media: String(post.media),
      isVideo: Boolean(post.is_video),
      likes: Number(post.likes),
      liked: Boolean(post.liked),
      time: relativeTime(post.created_at),
      comments: rows(
        `SELECT c.*, u.name, u.handle, u.avatar, u.color, u.status,
          (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) followers
          FROM feed_comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? ORDER BY c.created_at`,
        post.id
      ).map((comment) => ({
        id: String(comment.id),
        user: userDto({ ...comment, id: comment.user_id }),
        text: String(comment.text),
        time: relativeTime(comment.created_at),
        likes: Number(comment.like_count),
        liked: false,
      })),
    }));

  app.get("/feed", async (request) => feedFor((await optionalUser(request)) ?? ""));

  app.post("/posts/:id/comments", { preHandler: requireUser }, (request, reply) => {
    const { id: postId } = z.object({ id: z.string() }).parse(request.params);
    const { text } = textBody.parse(request.body);
    const userId = (request.user as AuthPayload).sub;
    const id = randomUUID();
    db.prepare("INSERT INTO feed_comments (id, post_id, user_id, text) VALUES (?, ?, ?, ?)").run(
      id,
      postId,
      userId,
      text
    );
    const user = row(`${userSelect} FROM users u WHERE u.id = ?`, userId)!;
    return reply
      .code(201)
      .send({ id, user: userDto(user), text, time: "now", likes: 0, liked: false });
  });

  app.post("/posts/:id/like", { preHandler: requireUser }, (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const result = db
      .prepare("INSERT OR IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)")
      .run(id, (request.user as AuthPayload).sub);
    if (result.changes) {
      db.prepare("UPDATE feed_posts SET like_count = like_count + 1 WHERE id = ?").run(id);
    }
    return reply.code(204).send();
  });
  app.delete("/posts/:id/like", { preHandler: requireUser }, (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const result = db
      .prepare("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?")
      .run(id, (request.user as AuthPayload).sub);
    if (result.changes) {
      db.prepare("UPDATE feed_posts SET like_count = MAX(0, like_count - 1) WHERE id = ?").run(id);
    }
    return reply.code(204).send();
  });

  app.post("/follows/:userId", { preHandler: requireUser }, (request, reply) => {
    const { userId } = z.object({ userId: z.string() }).parse(request.params);
    db.prepare("INSERT OR IGNORE INTO follows (follower_id, followed_id) VALUES (?, ?)").run(
      (request.user as AuthPayload).sub,
      userId
    );
    return reply.code(204).send();
  });
  app.delete("/follows/:userId", { preHandler: requireUser }, (request, reply) => {
    const { userId } = z.object({ userId: z.string() }).parse(request.params);
    db.prepare("DELETE FROM follows WHERE follower_id = ? AND followed_id = ?").run(
      (request.user as AuthPayload).sub,
      userId
    );
    return reply.code(204).send();
  });

  const canAccessConversation = (conversationId: string, userId: string) =>
    Boolean(
      row(
        "SELECT 1 ok FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
        conversationId,
        userId
      )
    );

  app.get("/conversations", { preHandler: requireUser }, (request) => {
    const userId = (request.user as AuthPayload).sub;
    return rows(
      `SELECT c.id, other.id user_id, other.name, other.handle, other.avatar, other.color, other.status,
      (SELECT COUNT(*) FROM follows f WHERE f.followed_id = other.id) followers,
      (SELECT text FROM direct_messages d WHERE d.conversation_id = c.id ORDER BY d.created_at DESC LIMIT 1) last_message,
      (SELECT created_at FROM direct_messages d WHERE d.conversation_id = c.id ORDER BY d.created_at DESC LIMIT 1) message_time
      FROM conversations c JOIN conversation_members mine ON mine.conversation_id = c.id AND mine.user_id = ?
      JOIN conversation_members theirs ON theirs.conversation_id = c.id AND theirs.user_id <> ?
      JOIN users other ON other.id = theirs.user_id ORDER BY c.updated_at DESC`,
      userId,
      userId
    ).map((item) => ({
      id: String(item.id),
      user: userDto({ ...item, id: item.user_id }),
      lastMessage: String(item.last_message ?? ""),
      time: relativeTime(item.message_time),
      unread: 0,
    }));
  });

  app.get("/conversations/:id/messages", { preHandler: requireUser }, (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const userId = (request.user as AuthPayload).sub;
    if (!canAccessConversation(id, userId))
      return reply.code(404).send({ message: "Conversation not found" });
    return rows(
      "SELECT * FROM direct_messages WHERE conversation_id = ? ORDER BY created_at",
      id
    ).map((message) => ({
      id: String(message.id),
      fromMe: message.sender_id === userId,
      text: String(message.text),
      time: relativeTime(message.created_at),
    }));
  });

  app.post("/conversations/:id/messages", { preHandler: requireUser }, (request, reply) => {
    const { id: conversationId } = z.object({ id: z.string() }).parse(request.params);
    const { text } = textBody.parse(request.body);
    const userId = (request.user as AuthPayload).sub;
    if (!canAccessConversation(conversationId, userId))
      return reply.code(404).send({ message: "Conversation not found" });
    const id = randomUUID();
    db.prepare(
      "INSERT INTO direct_messages (id, conversation_id, sender_id, text) VALUES (?, ?, ?, ?)"
    ).run(id, conversationId, userId, text);
    db.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
      conversationId
    );
    return reply.code(201).send({ id, fromMe: true, text, time: "now" });
  });

  return app;
}
