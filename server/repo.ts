import { randomUUID } from "node:crypto";
import { db } from "./db.ts";

/** Row shapes returned verbatim from sql queries (snake_case + join aliases). */
interface UserRow {
  id: string;
  email: string;
  handle: string;
  name: string;
  password_hash: string;
  avatar: string;
  color: string;
  bio: string;
  status: string;
  followers: number;
}

/** DTOs — the same shapes the client declares in src/types.ts. */
export interface UserDto {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  color: string;
  status: string;
  followers: number;
  bio?: string;
}

const uid = () => randomUUID();
const iso = () => new Date().toISOString();

export function timeAgo(isoDate: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export const userDto = (r: UserRow): UserDto => ({
  id: r.id,
  name: r.name,
  handle: r.handle,
  avatar: r.avatar,
  color: r.color,
  status: r.status,
  followers: r.followers,
  bio: r.bio,
});

export const getUser = (id: string): UserRow | undefined =>
  db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;

export const getUserByEmail = (email: string): UserRow | undefined =>
  db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as UserRow | undefined;

export const getUserByHandle = (handle: string): UserRow | undefined =>
  db.prepare("SELECT * FROM users WHERE handle = ?").get(handle) as UserRow | undefined;

export function createUser(data: {
  email: string;
  handle: string;
  name: string;
  passwordHash: string;
  avatar?: string;
  color?: string;
  bio?: string;
}): UserRow {
  const id = uid();
  const avatar = data.avatar ?? `https://i.pravatar.cc/150?u=${id}`;
  const color =
    data.color ?? ["#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b", "#10b981"][id.charCodeAt(0) % 5];
  db.prepare(
    `INSERT INTO users (id, email, handle, name, password_hash, avatar, color, bio, status, followers)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'online', 0)`
  ).run(
    id,
    data.email.toLowerCase(),
    data.handle,
    data.name,
    data.passwordHash,
    avatar,
    color,
    data.bio ?? ""
  );
  return getUser(id)!;
}

export function updateUser(
  id: string,
  patch: { name?: string; bio?: string; avatar?: string }
): UserRow {
  const u = getUser(id);
  if (!u) throw new Error("user not found");
  db.prepare("UPDATE users SET name = ?, bio = ?, avatar = ? WHERE id = ?").run(
    patch.name ?? u.name,
    patch.bio ?? u.bio,
    patch.avatar ?? u.avatar,
    id
  );
  return getUser(id)!;
}

export function listUsers(viewerId: string) {
  const rows = db
    .prepare(
      `SELECT u.*, EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = u.id) AS followed
       FROM users u WHERE u.id != ? ORDER BY u.rowid`
    )
    .all(viewerId, viewerId) as unknown as (UserRow & { followed: number })[];
  return rows.map((r) => ({ ...userDto(r), isFollowing: !!r.followed }));
}

export function toggleFollow(viewerId: string, userId: string) {
  const existing = db
    .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?")
    .get(viewerId, userId);
  if (existing) {
    db.prepare("DELETE FROM follows WHERE follower_id = ? AND followee_id = ?").run(
      viewerId,
      userId
    );
    db.prepare("UPDATE users SET followers = MAX(0, followers - 1) WHERE id = ?").run(userId);
  } else {
    db.prepare("INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)").run(
      viewerId,
      userId
    );
    db.prepare("UPDATE users SET followers = followers + 1 WHERE id = ?").run(userId);
  }
  const target = getUser(userId);
  return { following: !existing, followers: target?.followers ?? 0 };
}

export function meStats(userId: string) {
  const following = db
    .prepare("SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?")
    .get(userId)!.n as number;
  const streams = db.prepare("SELECT COUNT(*) AS n FROM streams WHERE host_id = ?").get(userId)!
    .n as number;
  return { following, streams };
}

// ── Streams ──────────────────────────────────────────────────────────────

export function listStreams(filter: { category?: string; q?: string }) {
  const clauses: string[] = ["s.discoverable = 1"];
  const params: (string | number)[] = [];
  if (filter.category && filter.category !== "All") {
    clauses.push("s.category = ?");
    params.push(filter.category);
  }
  if (filter.q) {
    clauses.push("(LOWER(s.title) LIKE ? OR LOWER(u.name) LIKE ?)");
    const like = `%${filter.q.toLowerCase()}%`;
    params.push(like, like);
  }
  const where = `WHERE ${clauses.join(" AND ")}`;
  const rows = db
    .prepare(
      `SELECT s.*, u.id AS h_id, u.name AS h_name, u.handle AS h_handle, u.avatar AS h_avatar,
              u.color AS h_color, u.status AS h_status, u.followers AS h_followers
       FROM streams s JOIN users u ON u.id = s.host_id
       ${where} ORDER BY s.sort, s.rowid`
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(streamDto);
}

function streamDto(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    title: r.title as string,
    host: {
      id: r.h_id,
      name: r.h_name,
      handle: r.h_handle,
      avatar: r.h_avatar,
      color: r.h_color,
      status: r.h_status,
      followers: r.h_followers,
    },
    category: r.category as string,
    thumbnail: r.thumbnail as string,
    viewers: r.viewers as number,
    live: !!r.live,
    tags: JSON.parse((r.tags as string) ?? "[]") as string[],
  };
}

export function myStreams(userId: string) {
  const rows = db
    .prepare(
      `SELECT s.*, u.id AS h_id, u.name AS h_name, u.handle AS h_handle, u.avatar AS h_avatar,
              u.color AS h_color, u.status AS h_status, u.followers AS h_followers
       FROM streams s JOIN users u ON u.id = s.host_id
       WHERE s.host_id = ? ORDER BY s.sort, s.rowid`
    )
    .all(userId) as Record<string, unknown>[];
  return rows.map(streamDto);
}

// ── Feed ─────────────────────────────────────────────────────────────────

export function listFeed(viewerId: string) {
  const posts = db
    .prepare(
      `SELECT p.*, u.id AS u_id, u.name AS u_name, u.handle AS u_handle, u.avatar AS u_avatar,
                     u.color AS u_color, u.status AS u_status, u.followers AS u_followers,
                     EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) AS liked,
                     EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = p.user_id) AS author_followed
              FROM feed_posts p JOIN users u ON u.id = p.user_id
              ORDER BY p.rowid`
    )
    .all(viewerId, viewerId) as Record<string, unknown>[];
  return posts.map((p) => ({
    ...postDto(p),
    comments: listComments(p.id as string, viewerId),
  }));
}

function postDto(p: Record<string, unknown>) {
  return {
    id: p.id as string,
    user: embeddedUser(p, "u"),
    caption: p.caption as string,
    media: p.media as string,
    isVideo: !!p.is_video,
    likes: p.likes as number,
    liked: !!p.liked,
    authorFollowed: !!p.author_followed,
    time: timeAgo(p.created_at as string),
  };
}

function embeddedUser(r: Record<string, unknown>, prefix: string) {
  return {
    id: r[`${prefix}_id`],
    name: r[`${prefix}_name`],
    handle: r[`${prefix}_handle`],
    avatar: r[`${prefix}_avatar`],
    color: r[`${prefix}_color`],
    status: r[`${prefix}_status`],
    followers: r[`${prefix}_followers`],
  };
}

export function listComments(postId: string, viewerId: string) {
  const rows = db
    .prepare(
      `SELECT c.*, u.id AS u_id, u.name AS u_name, u.handle AS u_handle, u.avatar AS u_avatar,
                     u.color AS u_color, u.status AS u_status, u.followers AS u_followers,
                     EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = ?) AS liked
              FROM feed_comments c JOIN users u ON u.id = c.user_id
              WHERE c.post_id = ? ORDER BY c.rowid`
    )
    .all(viewerId, postId) as Record<string, unknown>[];
  return rows.map(commentDto);
}

function commentDto(c: Record<string, unknown>) {
  return {
    id: c.id as string,
    user: embeddedUser(c, "u"),
    text: c.text as string,
    time: timeAgo(c.created_at as string),
    likes: c.likes as number,
    liked: !!c.liked,
  };
}

export function togglePostLike(postId: string, userId: string) {
  const has = db
    .prepare("SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?")
    .get(postId, userId);
  if (has) {
    db.prepare("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?").run(postId, userId);
    db.prepare("UPDATE feed_posts SET likes = MAX(0, likes - 1) WHERE id = ?").run(postId);
  } else {
    db.prepare("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)").run(postId, userId);
    db.prepare("UPDATE feed_posts SET likes = likes + 1 WHERE id = ?").run(postId);
  }
  const likes = db.prepare("SELECT likes FROM feed_posts WHERE id = ?").get(postId)!
    .likes as number;
  return { liked: !has, likes };
}

export function toggleCommentLike(commentId: string, userId: string) {
  const has = db
    .prepare("SELECT 1 FROM comment_likes WHERE comment_id = ? AND user_id = ?")
    .get(commentId, userId);
  if (has) {
    db.prepare("DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?").run(
      commentId,
      userId
    );
    db.prepare("UPDATE feed_comments SET likes = MAX(0, likes - 1) WHERE id = ?").run(commentId);
  } else {
    db.prepare("INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)").run(
      commentId,
      userId
    );
    db.prepare("UPDATE feed_comments SET likes = likes + 1 WHERE id = ?").run(commentId);
  }
  const likes = db.prepare("SELECT likes FROM feed_comments WHERE id = ?").get(commentId)!
    .likes as number;
  return { liked: !has, likes };
}

export function addComment(postId: string, userId: string, text: string) {
  const id = uid();
  db.prepare(
    "INSERT INTO feed_comments (id, post_id, user_id, text, likes, created_at) VALUES (?, ?, ?, ?, 0, ?)"
  ).run(id, postId, userId, text, iso());
  const row = db
    .prepare(
      `SELECT c.*, u.id AS u_id, u.name AS u_name, u.handle AS u_handle, u.avatar AS u_avatar,
                     u.color AS u_color, u.status AS u_status, u.followers AS u_followers, 0 AS liked
              FROM feed_comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`
    )
    .get(id) as Record<string, unknown>;
  return commentDto(row);
}

// ── Messaging ────────────────────────────────────────────────────────────

export function listConversations(userId: string) {
  const rows = db
    .prepare(
      `SELECT c.*, u.id AS p_id, u.name AS p_name, u.handle AS p_handle, u.avatar AS p_avatar,
              u.color AS p_color, u.status AS p_status, u.followers AS p_followers
       FROM conversations c
       JOIN users u ON u.id = CASE WHEN c.a_id = ? THEN c.b_id ELSE c.a_id END
       WHERE c.a_id = ? OR c.b_id = ? ORDER BY c.rowid`
    )
    .all(userId, userId, userId) as (Record<string, unknown> & {
    a_id: string;
    unread_a: number;
    unread_b: number;
    id: string;
  })[];
  return rows.map((c) => {
    const last = db
      .prepare(
        "SELECT text, created_at FROM direct_messages WHERE conversation_id = ? ORDER BY rowid DESC LIMIT 1"
      )
      .get(c.id) as { text: string; created_at: string } | undefined;
    return {
      id: c.id,
      user: embeddedUser(c, "p"),
      lastMessage: last?.text ?? "",
      time: last ? timeAgo(last.created_at) : "",
      unread: (c.a_id === userId ? c.unread_a : c.unread_b) as number,
    };
  });
}

export function getConversation(id: string, userId: string) {
  const c = db
    .prepare("SELECT * FROM conversations WHERE id = ? AND (a_id = ? OR b_id = ?)")
    .get(id, userId, userId);
  return c ?? null;
}

export function listMessages(conversationId: string, viewerId: string) {
  const rows = db
    .prepare("SELECT * FROM direct_messages WHERE conversation_id = ? ORDER BY rowid")
    .all(conversationId) as { id: string; sender_id: string; text: string; created_at: string }[];
  return rows.map((m) => ({
    id: m.id,
    fromMe: m.sender_id === viewerId,
    text: m.text,
    time: timeAgo(m.created_at),
  }));
}

export function sendMessage(conversationId: string, senderId: string, text: string) {
  const id = uid();
  const at = iso();
  db.prepare(
    "INSERT INTO direct_messages (id, conversation_id, sender_id, text, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, conversationId, senderId, text, at);
  // bump the peer's unread counter
  const c = db.prepare("SELECT a_id, b_id FROM conversations WHERE id = ?").get(conversationId) as {
    a_id: string;
    b_id: string;
  };
  const col = c.a_id === senderId ? "unread_b" : "unread_a";
  db.prepare(`UPDATE conversations SET ${col} = ${col} + 1 WHERE id = ?`).run(conversationId);
  return { id, fromMe: true, text, time: timeAgo(at) };
}

// ── Notifications ────────────────────────────────────────────────────────

export function listNotifications(userId: string) {
  const rows = db
    .prepare(
      `SELECT n.*, u.id AS a_id, u.name AS a_name, u.handle AS a_handle, u.avatar AS a_avatar,
              u.color AS a_color, u.status AS a_status, u.followers AS a_followers
       FROM notifications n JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = ? ORDER BY n.rowid`
    )
    .all(userId) as Record<string, unknown>[];
  return rows.map((n) => ({
    id: n.id as string,
    actor: embeddedUser(n, "a"),
    kind: n.kind as string,
    text: n.text as string,
    time: timeAgo(n.created_at as string),
    unread: !!n.unread,
  }));
}
