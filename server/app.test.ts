// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import { io as socketClient, type Socket } from "socket.io-client";
import { buildApp } from "./app";
import { db, row } from "./db";
import { seedDatabase } from "./seed";

let app: FastifyInstance;
let accessToken: string;
let socketUrl: string;

beforeAll(async () => {
  await seedDatabase();
  app = await buildApp();
  await app.listen({ host: "127.0.0.1", port: 0 });
  const address = app.server.address() as AddressInfo;
  socketUrl = `http://127.0.0.1:${address.port}`;
  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "demo@streamly.local", password: "streamly-demo" },
  });
  accessToken = response.json<{ accessToken: string }>().accessToken;
});

afterAll(async () => {
  await app.close();
  db.close();
});

describe("Streamly API", () => {
  it("reports health and serves public filtered streams", async () => {
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ status: "ok" });

    const streams = await app.inject({ method: "GET", url: "/streams?category=Gaming" });
    expect(streams.statusCode).toBe(200);
    const items = streams.json<Array<{ category: string }>>();
    expect(items.every((stream) => stream.category === "Gaming")).toBe(true);

    const feed = await app.inject({ method: "GET", url: "/feed" });
    expect(feed.statusCode).toBe(200);
    expect(feed.json<unknown[]>()).not.toHaveLength(0);

    const profile = await app.inject({ method: "GET", url: "/users/arianova" });
    expect(profile.statusCode).toBe(200);
  });

  it("broadcasts and persists realtime room chat for guests", async () => {
    const socket: Socket = socketClient(socketUrl, {
      path: "/socket.io",
      transports: ["websocket"],
      forceNew: true,
    });
    try {
      await new Promise<void>((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
      });
      const history = new Promise<unknown[]>((resolve) => socket.once("chat.history", resolve));
      socket.emit("room.join", { streamId: "s1" });
      await expect(history).resolves.toEqual(expect.any(Array));

      const incoming = new Promise<{ text: string }>((resolve) =>
        socket.once("chat.message", resolve)
      );
      socket.emit("chat.send", { streamId: "s1", text: "realtime integration" });
      await expect(incoming).resolves.toMatchObject({ text: "realtime integration" });
      expect(
        row(
          "SELECT text FROM live_messages WHERE stream_id = ? ORDER BY created_at DESC LIMIT 1",
          "s1"
        )?.text
      ).toBe("realtime integration");

      const gift = new Promise<{ gift: { id: string } }>((resolve) => socket.once("gift", resolve));
      socket.emit("gift.send", { streamId: "s1", giftId: "rose" });
      await expect(gift).resolves.toMatchObject({ gift: { id: "rose" } });
      expect(
        row(
          "SELECT gift_id FROM gift_events WHERE stream_id = ? ORDER BY created_at DESC LIMIT 1",
          "s1"
        )?.gift_id
      ).toBe("rose");
    } finally {
      socket.disconnect();
    }
  });

  it("protects private endpoints and publisher media tokens", async () => {
    const response = await app.inject({ method: "GET", url: "/me" });
    expect(response.statusCode).toBe(401);

    const publishToken = await app.inject({
      method: "POST",
      url: "/live/token",
      payload: { room: "broadcast", role: "publish" },
    });
    expect(publishToken.statusCode).toBe(401);
  });

  it("issues scoped viewer and publisher media tokens when LiveKit is configured", async () => {
    const previousKey = process.env.LIVEKIT_API_KEY;
    const previousSecret = process.env.LIVEKIT_API_SECRET;
    process.env.LIVEKIT_API_KEY = "test-api-key";
    process.env.LIVEKIT_API_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
    try {
      const viewer = await app.inject({
        method: "POST",
        url: "/live/token",
        payload: { room: "s1", role: "watch" },
      });
      expect(viewer.statusCode).toBe(200);
      expect(viewer.json<{ token: string }>().token.split(".")).toHaveLength(3);

      const publisher = await app.inject({
        method: "POST",
        url: "/live/token",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { room: "broadcast", role: "publish" },
      });
      expect(publisher.statusCode).toBe(200);
      expect(publisher.json<{ token: string }>().token.split(".")).toHaveLength(3);
    } finally {
      if (previousKey === undefined) delete process.env.LIVEKIT_API_KEY;
      else process.env.LIVEKIT_API_KEY = previousKey;
      if (previousSecret === undefined) delete process.env.LIVEKIT_API_SECRET;
      else process.env.LIVEKIT_API_SECRET = previousSecret;
    }
  });

  it("rotates refresh tokens and rejects reuse", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "demo@streamly.local", password: "streamly-demo" },
    });
    const oldRefreshToken = login.json<{ refreshToken: string }>().refreshToken;
    const rotated = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: oldRefreshToken },
    });
    expect(rotated.statusCode).toBe(200);
    expect(rotated.json<{ refreshToken: string }>().refreshToken).not.toBe(oldRefreshToken);

    const reused = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: oldRefreshToken },
    });
    expect(reused.statusCode).toBe(401);
  });

  it("creates a unique broadcast and marks it ended for its owner", async () => {
    const headers = { authorization: `Bearer ${accessToken}` };
    const created = await app.inject({
      method: "POST",
      url: "/streams",
      headers,
      payload: { title: "Integration Broadcast", category: "Tech" },
    });
    expect(created.statusCode).toBe(201);
    const stream = created.json<{ id: string; live: boolean; title: string }>();
    expect(stream).toMatchObject({ live: true, title: "Integration Broadcast" });

    const ended = await app.inject({
      method: "PATCH",
      url: `/streams/${stream.id}/end`,
      headers,
    });
    expect(ended.statusCode).toBe(200);
    expect(ended.json<{ live: boolean }>().live).toBe(false);
  });

  it("persists profile edits for a registered user", async () => {
    const unique = randomUUID().slice(0, 8);
    const registration = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Profile Tester",
        handle: `tester_${unique}`,
        email: `tester-${unique}@example.com`,
        password: "password123",
      },
    });
    const token = registration.json<{ accessToken: string }>().accessToken;
    const headers = { authorization: `Bearer ${token}` };
    const updated = await app.inject({
      method: "PATCH",
      url: "/me",
      headers,
      payload: { name: "Updated Creator", handle: `updated.${unique}` },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json<{ name: string; handle: string }>()).toMatchObject({
      name: "Updated Creator",
      handle: `@updated.${unique}`,
    });

    const restored = await app.inject({ method: "GET", url: "/me", headers });
    expect(restored.json<{ name: string }>().name).toBe("Updated Creator");
  });

  it("authenticates the seeded user and returns persisted social data", async () => {
    const headers = { authorization: `Bearer ${accessToken}` };
    const me = await app.inject({ method: "GET", url: "/me", headers });
    expect(me.statusCode).toBe(200);
    expect(me.json<{ handle: string }>().handle).toBe("@you");

    const feed = await app.inject({ method: "GET", url: "/feed", headers });
    expect(feed.statusCode).toBe(200);
    expect(feed.json<unknown[]>()).not.toHaveLength(0);

    const conversations = await app.inject({ method: "GET", url: "/conversations", headers });
    expect(conversations.statusCode).toBe(200);
    expect(conversations.json<unknown[]>()).not.toHaveLength(0);

    const profile = await app.inject({ method: "GET", url: "/users/arianova", headers });
    expect(profile.statusCode).toBe(200);
    expect(profile.json<{ user: { handle: string }; streams: unknown[] }>()).toMatchObject({
      user: { handle: "@arianova" },
    });
    expect(profile.json<{ streams: unknown[] }>().streams).not.toHaveLength(0);
  });
});
