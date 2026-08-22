import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { me } from "../data";
import type { FeedPost, FeedComment } from "../types";
import Avatar from "../components/Avatar";
import { Icon } from "../components/Icons";
import Modal from "../components/Modal";
import StoriesBar from "../components/StoriesBar";
import { cn } from "../utils/cn";
import { useFeed, useSession } from "../hooks/useData";
import { useAddComment, useSetFollow, useSetPostLike } from "../hooks/useSocialMutations";

// Comment counts are lifted to Feed so they stay in sync after adding new ones
function PostCard({
  post,
  commentCount,
  onOpenComments,
  onRequireAuth,
}: {
  post: FeedPost;
  commentCount: number;
  onOpenComments: (p: FeedPost) => void;
  onRequireAuth: () => boolean;
}) {
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [burst, setBurst] = useState(false);
  const [followed, setFollowed] = useState(false);
  const setPostLike = useSetPostLike();
  const setFollow = useSetFollow();

  const toggle = () => {
    if (!onRequireAuth()) return;
    setPostLike.mutate({ postId: post.id, liked: !liked });
    setLiked((l) => {
      setLikes((n) => (l ? n - 1 : n + 1));
      return !l;
    });
    if (!liked) {
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <Avatar user={post.user} size="md" ring showStatus />
        <div className="flex-1 min-w-0">
          <Link
            to={`/u/${post.user.handle.replace(/^@/, "")}`}
            className="text-sm font-semibold text-slate-800 hover:text-violet-500 dark:text-white"
          >
            {post.user.name}
          </Link>
          <p className="text-xs text-slate-400">
            {post.user.handle} · {post.time}
          </p>
        </div>
        <button
          onClick={() => {
            if (!onRequireAuth()) return;
            setFollow.mutate({ userId: post.user.id, following: !followed });
            setFollowed((f) => !f);
          }}
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition",
            followed
              ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
              : "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300"
          )}
        >
          {followed ? "Following ✓" : "Follow"}
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
              liked ? "text-red-500" : "text-slate-600 dark:text-slate-300"
            )}
          >
            <Icon.Heart className={cn("h-6 w-6", liked && "fill-red-500")} />
            {likes.toLocaleString()}
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
  const navigate = useNavigate();
  const { user: signedInUser } = useAuth();
  const requireAuth = () => {
    if (signedInUser) return true;
    navigate("/login?next=/feed");
    return false;
  };
  const { data: posts = [], isPending, isError, refetch } = useFeed();
  const { data: currentUser = me } = useSession();
  // Lift per-post comment state up so counts stay live
  const [allComments, setAllComments] = useState<Record<string, FeedComment[]>>({});
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const addCommentMutation = useAddComment();

  const activePost = posts.find((p) => p.id === activePostId) ?? null;
  const activeComments = activePostId
    ? (allComments[activePostId] ?? activePost?.comments ?? [])
    : [];

  const openComments = (p: FeedPost) => setActivePostId(p.id);

  const addComment = () => {
    if (!text.trim() || !activePostId || !requireAuth()) return;
    const commentText = text.trim();
    addCommentMutation.mutate({ postId: activePostId, text: commentText });
    const newComment: FeedComment = {
      id: `c${Date.now()}`,
      user: currentUser,
      text: commentText,
      time: "now",
      likes: 0,
      liked: false,
    };
    setAllComments((prev) => ({
      ...prev,
      [activePostId]: [...(prev[activePostId] ?? activePost?.comments ?? []), newComment],
    }));
    setText("");
  };

  const likeComment = (commentId: string) => {
    if (!activePostId || !requireAuth()) return;
    setAllComments((prev) => ({
      ...prev,
      [activePostId]: (prev[activePostId] ?? activePost?.comments ?? []).map((c) =>
        c.id === commentId
          ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 }
          : c
      ),
    }));
  };

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 pb-28 pt-4 md:pb-8">
      <h1 className="px-1 text-2xl font-bold text-slate-800 dark:text-white">Feed</h1>
      <StoriesBar onGoLive={onGoLive} />

      {isPending &&
        Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="shimmer aspect-[3/4] rounded-3xl" aria-hidden="true" />
        ))}
      {isError && (
        <div className="rounded-3xl border border-slate-200 p-8 text-center dark:border-slate-800">
          <p className="text-sm text-slate-500">Your feed could not be loaded.</p>
          <button
            onClick={() => void refetch()}
            className="mt-3 rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      )}
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          commentCount={(allComments[p.id] ?? p.comments).length}
          onOpenComments={openComments}
          onRequireAuth={requireAuth}
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
          <Avatar user={currentUser} size="xs" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addComment()}
            placeholder="Add a comment…"
            className="flex-1 bg-transparent text-sm outline-none text-slate-700 dark:text-white placeholder-slate-400"
          />
          <button onClick={addComment} className="text-violet-500 hover:text-violet-600 transition">
            <Icon.Send className="h-4 w-4" />
          </button>
        </div>
      </Modal>
    </div>
  );
}
