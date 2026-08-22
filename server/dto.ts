import type { Row } from "./db";

export const userDto = (record: Row) => ({
  id: String(record.id),
  name: String(record.name),
  handle: String(record.handle),
  avatar: String(record.avatar),
  color: String(record.color),
  status: String(record.status) as "online" | "away" | "offline",
  followers: Number(record.followers ?? 0),
});

export const relativeTime = (value: string | number | null) => {
  const elapsed = Math.max(0, Date.now() - new Date(String(value)).getTime());
  if (elapsed < 60_000) return "now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h`;
  return `${Math.floor(elapsed / 86_400_000)}d`;
};
