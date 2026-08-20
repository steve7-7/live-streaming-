import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Feed from "./Feed";
import { feedPosts } from "../data";
import type { FeedPost } from "../types";

const captionOf = (p: FeedPost) =>
  screen.getByText((_, el) => el?.tagName === "P" && (el.textContent ?? "").includes(p.caption));

describe("Feed", () => {
  it("renders all posts with their captions", () => {
    render(<Feed onGoLive={() => {}} />);
    for (const p of feedPosts) expect(captionOf(p)).toBeInTheDocument();
  });

  it("toggles like and updates the count", async () => {
    const user = userEvent.setup();
    render(<Feed onGoLive={() => {}} />);
    const post = feedPosts[0]; // 2341 likes, not liked by default
    const likeBtn = screen.getAllByRole("button", { name: post.likes.toLocaleString() })[0];
    await user.click(likeBtn);
    expect(
      screen.getAllByRole("button", { name: (post.likes + 1).toLocaleString() })[0]
    ).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: (post.likes + 1).toLocaleString() })[0]);
    expect(
      screen.getAllByRole("button", { name: post.likes.toLocaleString() })[0]
    ).toBeInTheDocument();
  });

  it("opens the comments modal and adds a comment", async () => {
    const user = userEvent.setup();
    render(<Feed onGoLive={() => {}} />);
    const post = feedPosts[0];
    const before = post.comments.length;

    await user.click(screen.getByRole("button", { name: `View all ${before} comments` }));
    expect(await screen.findByRole("heading", { name: "Comments" })).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/add a comment/i);
    await user.type(input, "looks great!");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("looks great!")).toBeInTheDocument();
    expect(screen.getByText(`View all ${before + 1} comments`)).toBeInTheDocument();
  });

  it("toggles the follow button", async () => {
    const user = userEvent.setup();
    render(<Feed onGoLive={() => {}} />);
    const followBtns = screen.getAllByRole("button", { name: "Follow" });
    await user.click(followBtns[0]);
    expect(screen.getAllByRole("button", { name: /Following/ })[0]).toBeInTheDocument();
  });

  it("wires the 'Your story' button to onGoLive", async () => {
    const user = userEvent.setup();
    const onGoLive = vi.fn();
    render(<Feed onGoLive={onGoLive} />);
    await user.click(screen.getByText("Your story"));
    expect(onGoLive).toHaveBeenCalledTimes(1);
  });
});
