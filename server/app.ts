import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import bcrypt from "bcryptjs";
import * as repo from "./repo.ts";
import { seedIfEmpty } from "./seed.ts";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; type: "access" | "refresh" };
    user: { sub: string; type: "access" | "refresh" };
  }
}

const badRequest = (reply: FastifyReply, error: string) => reply.code(400).send({ error });

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "warn" } });

  await app.register(cors, { origin: true });
  await app.register(jwt, {
    secret: process.env.STREAMLY_JWT_SECRET ?? "streamly-dev-secret-change-me",
  });

  seedIfEmpty(app.log);

  const signTokens = (userId: string) => ({
    accessToken: app.jwt.sign({ sub: userId, type: "access" }, { expiresIn: "1h" }),
    refreshToken: app.jwt.sign({ sub: userId, type: "refresh" }, { expiresIn: "7d" }),
  });

  /** Auth preHandler — anything below this line requires a valid access token. */
  const requireAuth = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
      if (req.user.type !== "access") throw new Error("unexpected token type");
    } catch {
      return reply.code(401).send({ error: "unauthorized" });
    }
  };
  const uid = (req: FastifyRequest) => req.user.sub;

  // ── Health ───────────────────────────────────────────────────────────────
  app.get("/api/health", async () => ({
    ok: true,
    name: "streamly-api",
    time: new Date().toISOString(),
  }));

  // ── Auth ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req, reply) => {
    const b = (req.body ?? {}) as Record<string, string>;
    const name = (b.name ?? "").trim();
    const handle = "@" + (b.handle ?? "").trim().replace(/^@+/, "").toLowerCase();
    const email = (b.email ?? "").trim();
    const password = b.password ?? "";

    if (name.length < 2) return badRequest(reply, "Name must be at least 2 characters");
    if (!/^@[a-z0-9_]{3,20}$/.test(handle))
      return badRequest(reply, "Handle must be 3–20 chars of [a-z0-9_]");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return badRequest(reply, "Invalid email");
    if (password.length < 8) return badRequest(reply, "Password must be at least 8 characters");
    if (repo.getUserByEmail(email))
      return reply.code(409).send({ error: "Email already registered" });
    if (repo.getUserByHandle(handle))
      return reply.code(409).send({ error: "Handle already taken" });

    const user = repo.createUser({
      email,
      handle,
      name,
      passwordHash: bcrypt.hashSync(password, 10),
      bio: "New to Streamly ✨",
    });
    return { user: repo.userDto(user), ...signTokens(user.id) };
  });

  app.post("/api/auth/login", async (req, reply) => {
    const b = (req.body ?? {}) as Record<string, string>;
    const user = repo.getUserByEmail((b.email ?? "").trim());
    if (!user || !bcrypt.compareSync(b.password ?? "", user.password_hash)) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }
    return { user: repo.userDto(user), ...signTokens(user.id) };
  });

  app.post("/api/auth/refresh", async (req, reply) => {
    const token = ((req.body ?? {}) as { refreshToken?: string }).refreshToken;
    if (!token) return badRequest(reply, "refreshToken required");
    try {
      const payload = app.jwt.verify<{ sub: string; type: string }>(token);
      if (payload.type !== "refresh") throw new Error("wrong type");
      const user = repo.getUser(payload.sub);
      if (!user) throw new Error("user gone");
      return { user: repo.userDto(user), ...signTokens(user.id) };
    } catch {
      return reply.code(401).send({ error: "invalid refresh token" });
    }
  });

  // ── Me / users ──────────────────────────────────────────────────────────
  app.get("/api/me", { preHandler: requireAuth }, async (req) => {
    const user = repo.getUser(uid(req));
    if (!user) return { error: "not found" };
    return { user: repo.userDto(user), stats: repo.meStats(user.id) };
  });

  app.patch("/api/me", { preHandler: requireAuth }, async (req, reply) => {
    const b = (req.body ?? {}) as { name?: string; bio?: string; avatar?: string };
    if (b.name !== undefined && b.name.trim().length < 2)
      return badRequest(reply, "Name too short");
    const user = repo.updateUser(uid(req), {
      name: b.name?.trim(),
      bio: b.bio,
      avatar: b.avatar,
    });
    return { user: repo.userDto(user) };
  });

  app.get("/api/users", { preHandler: requireAuth }, async (req) => ({
    users: repo.listUsers(uid(req)),
  }));

  app.post("/api/users/:id/follow", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (id === uid(req)) return badRequest(reply, "Cannot follow yourself");
    if (!repo.getUser(id)) return reply.code(404).send({ error: "user not found" });
    return repo.toggleFollow(uid(req), id);
  });

  // ── Streams ──────────────────────────────────────────────────────────────
  app.get("/api/streams", { preHandler: requireAuth }, async (req) => {
    const { category, q } = req.query as { category?: string; q?: string };
    return { streams: repo.listStreams({ category, q }) };
  });

  app.get("/api/streams/mine", { preHandler: requireAuth }, async (req) => ({
    streams: repo.myStreams(uid(req)),
  }));

  // ── Feed ─────────────────────────────────────────────────────────────────
  app.get("/api/feed", { preHandler: requireAuth }, async (req) => ({
    posts: repo.listFeed(uid(req)),
  }));

  app.post("/api/posts/:id/like", { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    return repo.togglePostLike(id, uid(req));
  });

  app.post("/api/posts/:id/comments", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const text = (((req.body ?? {}) as { text?: string }).text ?? "").trim();
    if (!text) return badRequest(reply, "Comment text required");
    return { comment: repo.addComment(id, uid(req), text) };
  });

  app.post("/api/comments/:id/like", { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    return repo.toggleCommentLike(id, uid(req));
  });

  // ── Messaging ────────────────────────────────────────────────────────────
  app.get("/api/conversations", { preHandler: requireAuth }, async (req) => ({
    conversations: repo.listConversations(uid(req)),
  }));

  app.get("/api/conversations/:id/messages", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!repo.getConversation(id, uid(req)))
      return reply.code(404).send({ error: "conversation not found" });
    return { messages: repo.listMessages(id, uid(req)) };
  });

  app.post("/api/conversations/:id/messages", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!repo.getConversation(id, uid(req)))
      return reply.code(404).send({ error: "conversation not found" });
    const text = (((req.body ?? {}) as { text?: string }).text ?? "").trim();
    if (!text) return badRequest(reply, "Message text required");
    return { message: repo.sendMessage(id, uid(req), text) };
  });

  // ── Notifications ────────────────────────────────────────────────────────
  app.get("/api/notifications", { preHandler: requireAuth }, async (req) => ({
    notifications: repo.listNotifications(uid(req)),
  }));

  return app;
}
