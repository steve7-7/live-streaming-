import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/streamly.db";
const filename = databaseUrl.startsWith("file:") ? databaseUrl.slice(5) : databaseUrl;
const databasePath = filename === ":memory:" ? filename : resolve(process.cwd(), filename);
if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);
db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

const migrationsDirectory = resolve(process.cwd(), "server/migrations");
for (const id of readdirSync(migrationsDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort()) {
  const applied = db.prepare("SELECT 1 FROM schema_migrations WHERE id = ?").get(id);
  if (applied) continue;
  const sql = readFileSync(resolve(migrationsDirectory, id), "utf8");
  db.exec("BEGIN");
  try {
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations (id) VALUES (?)").run(id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export type SqlValue = string | number | null;
export type Row = Record<string, SqlValue>;

export const rows = (sql: string, ...values: SqlValue[]) => db.prepare(sql).all(...values) as Row[];
export const row = (sql: string, ...values: SqlValue[]) =>
  db.prepare(sql).get(...values) as Row | undefined;
