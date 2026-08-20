import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

process.env.STREAMLY_DB = ":memory:";
process.env.STREAMLY_JWT_SECRET = "test-secret";
const { buildServer } = await import("./app.ts");

let app: FastifyInstance;
let auth: { authorization: string };

beforeAll(async () => {
  app = await buildServer();
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: "demo@streamly.app", password: "demo1234" },
  });
  expect(res.statusCode).toBe(200);
  auth = { authorization: `Bearer ${res.json().accessToken}` };
});

afterAll(async () => {
  await app.close();
});

describe("auth", () => {
  it("rejects bad credentials and missing tokens", async () => {
    const bad = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "demo@streamly.app", password: "wrong" },
    });
    expect(bad.statusCode).toBe(401);

    const noToken = await app.inject({ url: "/api/feed" });
    expect(noToken.statusCode).toBe(401);
  });

  it("registers a new user and validates input", async () => {
    const weak = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { name: "X", handle: "xx", email: "bad", password: "short" },
    });
    expect(weak.statusCode).toBe(400);

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        name: "New Person",
        handle: "newperson",
        email: "new@streamly.app",
        password: "password123",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.handle).toBe("@newperson");
    expect(body.accessToken).toBeTruthy();

    const dup = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        name: "Dup",
        handle: "newperson",
        email: "new@streamly.app",
        password: "password123",
      },
    });
    expect(dup.statusCode).toBe(409);
  });

  it("refreshes tokens", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "demo@streamly.app", password: "demo1234" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: { refreshToken: login.json().refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeTruthy();
  });
});

describe("streams", () => {
  it("lists, filters by category and search", async () => {
    const all = await app.inject({ url: "/api/streams", headers: auth });
    expect(all.json().streams).toHaveLength(8);

    const gaming = await app.inject({ url: "/api/streams?category=Gaming", headers: auth });
    expect(gaming.json().streams.map((s: { id: string }) => s.id)).toEqual(["s2"]);

    const ramen = await app.inject({ url: "/api/streams?q=ramen", headers: auth });
    expect(ramen.json().streams.map((s: { id: string }) => s.id)).toEqual(["s3"]);
  });

  it("exposes the demo account's VODs only under /streams/mine", async () => {
    const mine = await app.inject({ url: "/api/streams/mine", headers: auth });
    expect(mine.json().streams).toHaveLength(4);
    expect(mine.json().streams[0].host.id).toBe("me");

    const all = await app.inject({ url: "/api/streams", headers: auth });
    expect(all.json().streams.find((s: { id: string }) => s.id === "v1")).toBeUndefined();
  });
});

describe("feed & social", () => {
  it("toggles likes persistently", async () => {
    const like = await app.inject({ method: "POST", url: "/api/posts/p1/like", headers: auth });
    expect(like.json()).toEqual({ liked: true, likes: 2342 });

    const feed = await app.inject({ url: "/api/feed", headers: auth });
    expect(feed.json().posts[0].liked).toBe(true);
    expect(feed.json().posts[0].likes).toBe(2342);

    const unlike = await app.inject({ method: "POST", url: "/api/posts/p1/like", headers: auth });
    expect(unlike.json()).toEqual({ liked: false, likes: 2341 });
  });

  it("adds comments that persist", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/posts/p1/comments",
      headers: auth,
      payload: { text: "first!" },
    });
    expect(res.json().comment.user.id).toBe("me");

    const feed = await app.inject({ url: "/api/feed", headers: auth });
    expect(feed.json().posts[0].comments).toHaveLength(3);
  });

  it("toggles comment likes", async () => {
    const res = await app.inject({ method: "POST", url: "/api/comments/cm1/like", headers: auth });
    expect(res.json()).toEqual({ liked: true, likes: 13 });
  });

  it("toggles follow and reflects it in the users list", async () => {
    const res = await app.inject({ method: "POST", url: "/api/users/u5/follow", headers: auth });
    expect(res.json().following).toBe(true);

    const usersRes = await app.inject({ url: "/api/users", headers: auth });
    const u5 = usersRes.json().users.find((u: { id: string }) => u.id === "u5");
    expect(u5.isFollowing).toBe(true);
    expect(u5.followers).toBe(5601);
  });
});

describe("messaging & notifications", () => {
  it("lists conversations with unread counts and last message", async () => {
    const res = await app.inject({ url: "/api/conversations", headers: auth });
    const convos = res.json().conversations;
    expect(convos).toHaveLength(5);
    expect(convos[0].unread).toBe(2);
    expect(convos[0].lastMessage).toContain("stream tonight");
  });

  it("sends DMs that persist and bump the peer's unread", async () => {
    await app.inject({
      method: "POST",
      url: "/api/conversations/c1/messages",
      headers: auth,
      payload: { text: "see you soon" },
    });
    const thread = await app.inject({ url: "/api/conversations/c1/messages", headers: auth });
    const msgs = thread.json().messages;
    expect(msgs[msgs.length - 1]).toMatchObject({ fromMe: true, text: "see you soon" });
  });

  it("returns seeded notifications newest flow intact", async () => {
    const res = await app.inject({ url: "/api/notifications", headers: auth });
    expect(res.json().notifications).toHaveLength(6);
    expect(res.json().notifications[0].kind).toBe("live");
  });
});
