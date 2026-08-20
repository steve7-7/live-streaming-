import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * SQLite via node:sqlite — zero native deps.
 *
 * Every query goes through `repo.ts`; the DAL interface intentionally mirrors
 * the Phase-1 plan's repository contract so swapping to Prisma/PostgreSQL
 * later (when binaries are available) touches only this layer.
 */
const DB_PATH = process.env.STREAMLY_DB ?? "server/data/streamly.db";

if (DB_PATH !== ":memory:") mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  handle        TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar        TEXT NOT NULL,
  color         TEXT NOT NULL,
  bio           TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'online',
  followers     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id),
  followee_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (follower_id, followee_id)
);

CREATE TABLE IF NOT EXISTS streams (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  host_id      TEXT NOT NULL REFERENCES users(id),
  category     TEXT NOT NULL,
  thumbnail    TEXT NOT NULL,
  viewers      INTEGER NOT NULL DEFAULT 0,
  live         INTEGER NOT NULL DEFAULT 0,
  tags         TEXT NOT NULL DEFAULT '[]',
  sort         INTEGER NOT NULL DEFAULT 0,
  discoverable INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS feed_posts (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  caption    TEXT NOT NULL,
  media      TEXT NOT NULL,
  is_video   INTEGER NOT NULL DEFAULT 0,
  likes      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id TEXT NOT NULL REFERENCES feed_posts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS feed_comments (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL REFERENCES feed_posts(id),
  user_id    TEXT NOT NULL REFERENCES users(id),
  text       TEXT NOT NULL,
  likes      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id TEXT NOT NULL REFERENCES feed_comments(id),
  user_id    TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id       TEXT PRIMARY KEY,
  a_id     TEXT NOT NULL REFERENCES users(id),
  b_id     TEXT NOT NULL REFERENCES users(id),
  unread_a INTEGER NOT NULL DEFAULT 0,
  unread_b INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  sender_id       TEXT NOT NULL REFERENCES users(id),
  text            TEXT NOT NULL,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  actor_id   TEXT NOT NULL REFERENCES users(id),
  kind       TEXT NOT NULL,
  text       TEXT NOT NULL,
  unread     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
`);
