import type { Reaction } from "../types";

export default function FloatingReactions({ reactions }: { reactions: Reaction[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {reactions.map((r) => (
        <span
          key={r.id}
          className="float-emoji absolute bottom-16 text-3xl"
          style={{ left: `${r.x}%` }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}
