import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Feed from "./Feed";
import { feedPosts, me } from "../data";
import type { FeedPost } from "../types";

// In-memory mock of the Phase 1 API with the fixtures as its database.
// Each test resets it via beforeEach below.
vi.mock("../lib/api", async () => {
  const { feedPosts, users, me } = await import("../data");

  const state = {
    liked: new Map<string, boolean>(),
    likesDelta: new Map<string, number>(),
    following: new Map<string, boolean>(),
    added: {} as Record<string, unknown[]>,
    reset() {
      this.liked.clear();
      this.likesDelta.clear();
      this.following.clear();
      this.added = {};
    },
  };
  (globalThis as Record<string, unknown>).__mockApi = state;

  const likedOf = (p: (typeof feedPosts)[number]) => state.liked.get(p.id) ?? p.liked;
  const likesOf = (p: (typeof feedPosts)[number]) => p.likes + (state.likesDelta.get(p.id) ?? 0);
  const posts = () =>
    feedPosts.map((p) => ({
      ...p,
      liked: likedOf(p),
      likes: likesOf(p),
      authorFollowed: state.following.get(p.user.id) ?? false,
      comments: [...p.comments, ...(state.added[p.id] ?? [])],
    }));

  let commentSeq = 0;
  return {
    api: {
      get: (path: string) => {
        if (path === "/feed") return Promise.resolve({ posts: posts() });
        if (path === "/users")
          return Promise.resolve({
            users: users.map((u) => ({ ...u, isFollowing: state.following.get(u.id) ?? false })),
          });
        return Promise.reject(new Error(`unmocked GET ${path}`));
      },
      post: (path: string, body?: { text?: string }) => {
        const likeMatch = path.match(/^\/posts\/(.+)\/like$/);
        if (likeMatch) {
          const p = feedPosts.find((x) => x.id === likeMatch[1])!;
          const liked = !likedOf(p);
          state.liked.set(p.id, liked);
          state.likesDelta.set(p.id, (state.likesDelta.get(p.id) ?? 0) + (liked ? 1 : -1));
          return Promise.resolve({ liked, likes: likesOf(p) });
        }
        const commentMatch = path.match(/^\/posts\/(.+)\/comments$/);
        if (commentMatch) {
          const comment = {
            id: `nc${++commentSeq}`,
            user: me,
            text: body?.text ?? "",
            time: "now",
            likes: 0,
            liked: false,
          };
          const pid = commentMatch[1];
          state.added[pid] = [...(state.added[pid] ?? []), comment];
          return Promise.resolve({ comment });
        }
        const clMatch = path.match(/^\/comments\/(.+)\/like$/);
        if (clMatch) {
          const c = feedPosts.flatMap((p) => p.comments).find((x) => x.id === clMatch[1])!;
          return Promise.resolve({ liked: !c.liked, likes: c.likes + (c.liked ? -1 : 1) });
        }
        const followMatch = path.match(/^\/users\/(.+)\/follow$/);
        if (followMatch) {
          const following = !(state.following.get(followMatch[1]) ?? false);
          state.following.set(followMatch[1], following);
          return Promise.resolve({ following, followers: 1 });
        }
        return Promise.reject(new Error(`unmocked POST ${path}`));
      },
      patch: () => Promise.reject(new Error("unmocked")),
    },
  };
});

vi.mock("../lib/auth", async () => {
  const { me } = await import("../data");
  return {
    useAuth: () => ({ user: me, status: "authed" as const, setUser: () => {} }),
    AuthProvider: ({ children }: { children: ReactNode }) => children,
  };
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
  >
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  (globalThis as unknown as { __mockApi: { reset(): void } }).__mockApi.reset();
});

const captionOf = (p: FeedPost) =>
  screen.findByText((_, el) => el?.tagName === "P" && (el.textContent ?? "").includes(p.caption));

describe("Feed", () => {
  it("renders all posts with their captions", async () => {
    render(<Feed onGoLive={() => {}} />, { wrapper });
    for (const p of feedPosts) expect(await captionOf(p)).toBeInTheDocument();
  });

  it("toggles like persistently and updates the count", async () => {
    const user = userEvent.setup();
    render(<Feed onGoLive={() => {}} />, { wrapper });
    const post = feedPosts[0]; // 2341 likes, not liked by default
    const likeBtns = await screen.findAllByRole("button", {
      name: post.likes.toLocaleString(),
    });
    await user.click(likeBtns[0]);
    expect(
      await screen.findAllByRole("button", { name: (post.likes + 1).toLocaleString() })
    ).not.toHaveLength(0);

    await user.click(
      (await screen.findAllByRole("button", { name: (post.likes + 1).toLocaleString() }))[0]
    );
    expect(
      await screen.findAllByRole("button", { name: post.likes.toLocaleString() })
    ).not.toHaveLength(0);
  });

  it("opens the comments modal and adds a comment", async () => {
    const user = userEvent.setup();
    render(<Feed onGoLive={() => {}} />, { wrapper });
    const post = feedPosts[0];
    const before = post.comments.length;

    await user.click(await screen.findByRole("button", { name: `View all ${before} comments` }));
    expect(await screen.findByRole("heading", { name: "Comments" })).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/add a comment/i);
    await user.type(input, "looks great!");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("looks great!")).toBeInTheDocument();
    expect(await screen.findByText(`View all ${before + 1} comments`)).toBeInTheDocument();
  });

  it("toggles the follow button from server state", async () => {
    const user = userEvent.setup();
    render(<Feed onGoLive={() => {}} />, { wrapper });
    const followBtns = await screen.findAllByRole("button", { name: "Follow" });
    await user.click(followBtns[0]);
    expect((await screen.findAllByRole("button", { name: /Following/ }))[0]).toBeInTheDocument();
  });

  it("wires the 'Your story' button to onGoLive", async () => {
    const user = userEvent.setup();
    const onGoLive = vi.fn();
    render(<Feed onGoLive={onGoLive} />, { wrapper });
    await user.click(await screen.findByText("Your story"));
    expect(onGoLive).toHaveBeenCalledTimes(1);
  });

  it("keeps session identity for own content", () => {
    expect(me.handle).toBe("@you");
  });
});
