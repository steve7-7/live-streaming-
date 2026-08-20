import bcrypt from "bcryptjs";
import { db } from "./db.ts";
import { me, users, streams, feedPosts, conversations, dmThreads } from "../src/data.ts";

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

/**
 * Seeds the database from the shared demo fixtures (src/data.ts) on first
 * boot so the UI ships pixel-identical — the fixtures stop being the data
 * source and become the seed, exactly as the roadmap prescribes.
 */
export function seedIfEmpty(log?: { info: (m: string) => void }) {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get()!.n as number;
  if (count > 0) return;

  const passwordHash = bcrypt.hashSync("demo1234", 10);
  const insertUser = db.prepare(
    `INSERT INTO users (id, email, handle, name, password_hash, avatar, color, bio, status, followers)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const defaultBio = "🎥 Content creator · Live most evenings · Gaming, music & tech ✨";
  insertUser.run(
    me.id,
    "demo@streamly.app",
    me.handle,
    me.name,
    passwordHash,
    me.avatar,
    me.color,
    defaultBio,
    me.status,
    me.followers
  );
  for (const u of users) {
    insertUser.run(
      u.id,
      `${u.handle.replace("@", "")}@streamly.app`,
      u.handle,
      u.name,
      passwordHash,
      u.avatar,
      u.color,
      "",
      u.status,
      u.followers
    );
  }

  const insertStream = db.prepare(
    `INSERT INTO streams (id, title, host_id, category, thumbnail, viewers, live, tags, sort, discoverable)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  streams.forEach((s, i) => {
    insertStream.run(
      s.id,
      s.title,
      s.host.id,
      s.category,
      s.thumbnail,
      s.viewers,
      s.live ? 1 : 0,
      JSON.stringify(s.tags),
      i,
      1
    );
  });

  // Past VODs owned by the demo account — power Profile's "Your streams" row
  // (not discoverable, so the Discover grid keeps its fixture parity).
  const vods = [
    ["v1", "Friday Games Night — Full Replay", "Gaming", 12800, "vod-games"],
    ["v2", "Ramen Kitchen: Uncut Session", "Food", 8400, "vod-ramen"],
    ["v3", "Studio Session Vol. 3", "Music", 9821, "vod-studio"],
    ["v4", "Q&A Highlights — Best Moments", "Talk", 4300, "vod-qa"],
  ] as const;
  vods.forEach(([id, title, cat, viewers, seed], i) => {
    insertStream.run(
      id,
      title,
      me.id,
      cat,
      `https://picsum.photos/seed/${seed}/600/400`,
      viewers,
      0,
      "[]",
      20 + i,
      0
    );
  });

  // Follows: the demo account already follows a few creators
  const insertFollow = db.prepare("INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)");
  for (const f of [users[0], users[1], users[3]]) insertFollow.run(me.id, f.id);

  // Feed posts + comments with realistic timestamps
  const postAges: Record<string, number> = { p1: 60, p2: 180, p3: 360 };
  const commentAges: Record<string, number> = { cm1: 45, cm2: 30, cm3: 120 };
  const insertPost = db.prepare(
    "INSERT INTO feed_posts (id, user_id, caption, media, is_video, likes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertComment = db.prepare(
    "INSERT INTO feed_comments (id, post_id, user_id, text, likes, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const p of feedPosts) {
    insertPost.run(
      p.id,
      p.user.id,
      p.caption,
      p.media,
      p.isVideo ? 1 : 0,
      p.likes,
      ago(postAges[p.id] ?? 60)
    );
    if (p.liked)
      db.prepare("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)").run(p.id, me.id);
    for (const c of p.comments) {
      insertComment.run(c.id, p.id, c.user.id, c.text, c.likes, ago(commentAges[c.id] ?? 60));
    }
  }

  // Conversations + DMs. Timestamps are offset so timeAgo matches the fixture strings.
  const dmAges: Record<string, number> = {
    d1: 5,
    d2: 4,
    d3: 2,
    d4: 20,
    d5: 18,
    d6: 60,
    d7: 182,
    d8: 180,
    d9: 300,
  };
  const insertConvo = db.prepare(
    "INSERT INTO conversations (id, a_id, b_id, unread_a, unread_b) VALUES (?, ?, ?, ?, 0)"
  );
  const insertDm = db.prepare(
    "INSERT INTO direct_messages (id, conversation_id, sender_id, text, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  for (const c of conversations) {
    insertConvo.run(c.id, me.id, c.user.id, c.unread);
    for (const m of dmThreads[c.id] ?? []) {
      insertDm.run(m.id, c.id, m.fromMe ? me.id : c.user.id, m.text, ago(dmAges[m.id] ?? 60));
    }
  }

  // Notifications (mirror the prototype panel 1:1)
  const noteSeeds = [
    ["n1", users[0], "live", "started a live stream", 1, 1],
    ["n2", users[3], "like", "liked your broadcast", 1, 5],
    ["n3", users[7], "invite", "invited you to a group call", 1, 12],
    ["n4", users[1], "comment", 'commented: "amazing setup!"', 0, 60],
    ["n5", users[5], "follow", "started following you", 0, 120],
    ["n6", users[6], "gift", "sent you a gift 🎁", 0, 180],
  ] as const;
  const insertNote = db.prepare(
    "INSERT INTO notifications (id, user_id, actor_id, kind, text, unread, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  for (const [id, actor, kind, text, unread, minutes] of noteSeeds) {
    insertNote.run(id, me.id, actor.id, kind, text, unread, ago(minutes));
  }

  log?.info("database seeded from demo fixtures");
}
