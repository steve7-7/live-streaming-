import { useState } from "react";
import type { FeedPost, FeedComment } from "../types";
import { useAddComment, useFeed, useLikeComment, useLikePost, useToggleFollow } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import Avatar from "../components/Avatar";
import { Icon } from "../components/Icons";
import Modal from "../components/Modal";
import StoriesBar from "../components/StoriesBar";
import { cn } from "../utils/cn";

// Comment counts are lifted to Feed so they stay in sync after adding new ones
function PostCard({
  post,
  commentCount,
  onOpenComments,
  onToggleLike,
  onToggleFollow,
}: {
  post: FeedPost;
  commentCount: number;
  onOpenComments: (p: FeedPost) => void;
  onToggleLike: (postId: string) => void;
  onToggleFollow: (userId: string) => void;
}) {
  const [burst, setBurst] = useState(false);

  const toggle = () => {
    if (!post.liked) {
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
    onToggleLike(post.id);
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <Avatar user={post.user} size="md" ring showStatus />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">{post.user.name}</p>
          <p className="text-xs text-slate-400">
            {post.user.handle} · {post.time}
          </p>
        </div>
        <button
          onClick={() => onToggleFollow(post.user.id)}
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition",
            post.authorFollowed
              ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
              : "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300"
          )}
        >
          {post.authorFollowed ? "Following ✓" : "Follow"}
        </button>
      </div>

      {/* Media */}
      <div
        className="shimmer relative aspect-square bg-slate-100 dark:bg-slate-800 cursor-pointer"
        onDoubleClick={toggle}
      >
        <img src={post.media} alt="" className="h-full w-full object-cover" />
        {post.isVideo && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            <Icon.Video className="h-3.5 w-3.5" /> Reel
          </span>
        )}
        {burst && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Icon.Heart
              className="h-24 w-24 fill-white text-white drop-shadow-lg"
              style={{ animation: "popIn .5s ease" }}
            />
          </div>
        )}
      </div>

      {/* Actions + caption */}
      <div className="p-4">
        <div className="mb-3 flex items-center gap-4">
          <button
            onClick={toggle}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium transition active:scale-90",
              post.liked ? "text-red-500" : "text-slate-600 dark:text-slate-300"
            )}
          >
            <Icon.Heart className={cn("h-6 w-6", post.liked && "fill-red-500")} />
            {post.likes.toLocaleString()}
          </button>
          <button
            onClick={() => onOpenComments(post)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:text-violet-500"
          >
            <Icon.Comment className="h-6 w-6" />
            {commentCount}
          </button>
          <button className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:text-violet-500">
            <Icon.Share className="h-6 w-6" />
          </button>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          <span className="font-semibold">{post.user.handle}</span> {post.caption}
        </p>
        {commentCount > 0 && (
          <button
            onClick={() => onOpenComments(post)}
            className="mt-2 text-xs text-slate-400 hover:text-violet-500 transition"
          >
            View all {commentCount} comments
          </button>
        )}
      </div>
    </article>
  );
}

export default function Feed({ onGoLive }: { onGoLive: () => void }) {
  const { user: me } = useAuth();
  const { data: posts = [], isLoading } = useFeed();
  const likePost = useLikePost();
  const addCommentMut = useAddComment();
  const likeCommentMut = useLikeComment();
  const toggleFollow = useToggleFollow();

  // Locally-held comment overlays keyed by post id (seeded from the API posts on first use)
  const [allComments, setAllComments] = useState<Record<string, FeedComment[]>>({});
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [text, setText] = useState("");

  const commentsOf = (p: FeedPost) => allComments[p.id] ?? p.comments;
  const activePost = posts.find((p) => p.id === activePostId) ?? null;
  const activeComments = activePost ? commentsOf(activePost) : [];

  const openComments = (p: FeedPost) => setActivePostId(p.id);

  const addComment = () => {
    if (!text.trim() || !activePost) return;
    const draft = text.trim();
    addCommentMut.mutate(
      { postId: activePost.id, text: draft },
      {
        onSuccess: (comment) => {
          setAllComments((prev) => ({
            ...prev,
            [activePost.id]: [...(prev[activePost.id] ?? activePost.comments), comment],
          }));
          setText("");
        },
      }
    );
  };

  const likeComment = (commentId: string) => {
    likeCommentMut.mutate(commentId, {
      onSuccess: ({ liked, likes }) => {
        setAllComments((prev) => {
          const next = { ...prev };
          for (const pid of Object.keys(next)) {
            next[pid] = next[pid].map((c) => (c.id === commentId ? { ...c, liked, likes } : c));
          }
          return next;
        });
      },
    });
  };

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 pb-28 pt-4 md:pb-8">
      <h1 className="px-1 text-2xl font-bold text-slate-800 dark:text-white">Feed</h1>
      <StoriesBar onGoLive={onGoLive} />

      {isLoading &&
        [0, 1].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <div className="flex items-center gap-3 p-4">
              <div className="shimmer h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="shimmer h-3 w-1/3 rounded" />
                <div className="shimmer h-2 w-1/4 rounded" />
              </div>
            </div>
            <div className="shimmer aspect-square" />
          </div>
        ))}

      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          commentCount={commentsOf(p).length}
          onOpenComments={openComments}
          onToggleLike={(id) => likePost.mutate(id)}
          onToggleFollow={(id) => toggleFollow.mutate(id)}
        />
      ))}

      {/* Comments modal */}
      <Modal open={!!activePost} onClose={() => setActivePostId(null)} title="Comments">
        <div className="space-y-4">
          {activeComments.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">
              No comments yet. Be the first!
            </p>
          )}
          {activeComments.map((c) => (
            <div key={c.id} className="flex gap-3 animate-[fade_.2s_ease]">
              <Avatar user={c.user} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  <span className="font-semibold">{c.user.name}</span> {c.text}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {c.time} · {c.likes} {c.likes === 1 ? "like" : "likes"}
                </p>
              </div>
              <button
                onClick={() => likeComment(c.id)}
                className={cn(
                  "shrink-0 transition active:scale-90",
                  c.liked ? "text-red-500" : "text-slate-400"
                )}
              >
                <Icon.Heart className={cn("h-4 w-4", c.liked && "fill-red-500")} />
              </button>
            </div>
          ))}
        </div>

        {/* Add comment */}
        <div className="mt-4 flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2">
          {me && <Avatar user={me} size="xs" />}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addComment()}
            placeholder="Add a comment…"
            className="flex-1 bg-transparent text-sm outline-none text-slate-700 dark:text-white placeholder-slate-400"
          />
          <button
            onClick={addComment}
            disabled={addCommentMut.isPending}
            className="text-violet-500 hover:text-violet-600 transition disabled:opacity-50"
          >
            <Icon.Send className="h-4 w-4" />
          </button>
        </div>
      </Modal>
    </div>
  );
}
