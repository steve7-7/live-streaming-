CREATE TABLE IF NOT EXISTS gifts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  coin_cost INTEGER NOT NULL CHECK (coin_cost > 0)
);

CREATE TABLE IF NOT EXISTS gift_events (
  id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL,
  sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  guest_name TEXT,
  gift_id TEXT NOT NULL REFERENCES gifts(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS gift_events_stream_created_idx
  ON gift_events(stream_id, created_at);

INSERT OR IGNORE INTO gifts (id, name, emoji, coin_cost) VALUES
  ('rose', 'Rose', '🌹', 10),
  ('party', 'Party', '🎉', 50),
  ('diamond', 'Diamond', '💎', 100),
  ('crown', 'Crown', '👑', 250),
  ('rocket', 'Rocket', '🚀', 500),
  ('unicorn', 'Unicorn', '🦄', 1000);
