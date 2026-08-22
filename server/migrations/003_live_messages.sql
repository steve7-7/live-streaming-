CREATE TABLE IF NOT EXISTS live_messages (
  id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  guest_name TEXT,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS live_messages_stream_created_idx
  ON live_messages(stream_id, created_at);
