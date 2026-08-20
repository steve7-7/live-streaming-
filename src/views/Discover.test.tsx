import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Discover from "./Discover";
import { streams } from "../data";

const mount = () => {
  const onWatch = vi.fn();
  const onGoLive = vi.fn();
  render(<Discover onWatch={onWatch} onGoLive={onGoLive} />);
  return { onWatch, onGoLive };
};

describe("Discover", () => {
  it("renders every stream card initially", () => {
    mount();
    for (const s of streams) expect(screen.getByText(s.title)).toBeInTheDocument();
  });

  it("filters streams by category", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: "Gaming" }));
    for (const s of streams) {
      if (s.category === "Gaming") expect(screen.getByText(s.title)).toBeInTheDocument();
      else expect(screen.queryByText(s.title)).not.toBeInTheDocument();
    }
  });

  it("filters streams by search text", async () => {
    const user = userEvent.setup();
    mount();
    await user.type(screen.getByPlaceholderText(/search live streams/i), "ramen");
    const ramen = streams.find((s) => s.title.toLowerCase().includes("ramen"))!;
    expect(screen.getByText(ramen.title)).toBeInTheDocument();
    expect(screen.queryByText(streams[0].title)).not.toBeInTheDocument();
  });

  it("shows the empty state when nothing matches and can clear filters", async () => {
    const user = userEvent.setup();
    mount();
    await user.type(screen.getByPlaceholderText(/search live streams/i), "zzz-no-match");
    expect(screen.getByText(/no streams found/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /clear filters/i }));
    for (const s of streams) expect(screen.getByText(s.title)).toBeInTheDocument();
  });

  it("marks the most-watched live stream as Featured", () => {
    mount();
    const top = streams.filter((s) => s.live).reduce((a, b) => (b.viewers > a.viewers ? b : a));
    const badge = screen.getByText("Featured");
    expect(badge).toBeInTheDocument();
    expect(screen.getByText(top.title).closest("button")).toContainElement(badge);
  });

  it("invokes onWatch with the clicked stream", async () => {
    const user = userEvent.setup();
    const { onWatch } = mount();
    await user.click(screen.getByText(streams[0].title));
    expect(onWatch).toHaveBeenCalledWith(streams[0]);
  });

  it("invokes onGoLive from the banner buttons", async () => {
    const user = userEvent.setup();
    const { onGoLive } = mount();
    await user.click(screen.getByRole("button", { name: /go live/i }));
    expect(onGoLive).toHaveBeenCalledWith("broadcast");
    await user.click(screen.getByRole("button", { name: /group call/i }));
    expect(onGoLive).toHaveBeenCalledWith("group");
  });
});
