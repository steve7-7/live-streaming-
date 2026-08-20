import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import Discover from "./Discover";
import { streams } from "../data";

// Emulates the backend's filter semantics for the client-only unit tests
vi.mock("../lib/api", async () => {
  const { streams } = await import("../data");
  return {
    api: {
      get: (path: string) => {
        const [pathname, qs] = path.split("?");
        if (pathname === "/streams") {
          const params = new URLSearchParams(qs ?? "");
          const category = params.get("category");
          const q = (params.get("q") ?? "").toLowerCase();
          let list = streams;
          if (category) list = list.filter((s) => s.category === category);
          if (q)
            list = list.filter(
              (s) => s.title.toLowerCase().includes(q) || s.host.name.toLowerCase().includes(q)
            );
          return Promise.resolve({ streams: list });
        }
        return Promise.reject(new Error(`unmocked GET ${path}`));
      },
      post: () => Promise.reject(new Error("unmocked")),
      patch: () => Promise.reject(new Error("unmocked")),
    },
  };
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
  >
    {children}
  </QueryClientProvider>
);

const mount = () => {
  const onWatch = vi.fn();
  const onGoLive = vi.fn();
  render(<Discover onWatch={onWatch} onGoLive={onGoLive} />, { wrapper });
  return { onWatch, onGoLive };
};

describe("Discover", () => {
  it("renders every stream card initially", async () => {
    mount();
    for (const s of streams) expect(await screen.findByText(s.title)).toBeInTheDocument();
  });

  it("filters streams by category via the API", async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByText(streams[0].title);

    await user.click(screen.getByRole("button", { name: "Gaming" }));
    for (const s of streams) {
      if (s.category === "Gaming") expect(await screen.findByText(s.title)).toBeInTheDocument();
      else expect(screen.queryByText(s.title)).not.toBeInTheDocument();
    }
  });

  it("filters streams by search text via the API", async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByText(streams[0].title);

    await user.type(screen.getByPlaceholderText(/search live streams/i), "ramen");
    const ramen = streams.find((s) => s.title.toLowerCase().includes("ramen"))!;
    expect(await screen.findByText(ramen.title)).toBeInTheDocument();
    expect(screen.queryByText(streams[0].title)).not.toBeInTheDocument();
  });

  it("shows the empty state when nothing matches and can clear filters", async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByText(streams[0].title);

    await user.type(screen.getByPlaceholderText(/search live streams/i), "zzz-no-match");
    expect(await screen.findByText(/no streams found/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear filters/i }));
    for (const s of streams) expect(await screen.findByText(s.title)).toBeInTheDocument();
  });

  it("marks the most-watched live stream as Featured", async () => {
    mount();
    const top = streams.filter((s) => s.live).reduce((a, b) => (b.viewers > a.viewers ? b : a));
    const badge = await screen.findByText("Featured");
    expect(badge).toBeInTheDocument();
    expect(screen.getByText(top.title).closest("button")).toContainElement(badge);
  });

  it("invokes onWatch with the clicked stream", async () => {
    const user = userEvent.setup();
    const { onWatch } = mount();
    await user.click(await screen.findByText(streams[0].title));
    expect(onWatch).toHaveBeenCalledWith(streams[0]);
  });

  it("invokes onGoLive from the banner buttons", async () => {
    const user = userEvent.setup();
    const { onGoLive } = mount();
    await screen.findByText(streams[0].title);
    await user.click(screen.getByRole("button", { name: /go live/i }));
    expect(onGoLive).toHaveBeenCalledWith("broadcast");
    await user.click(screen.getByRole("button", { name: /group call/i }));
    expect(onGoLive).toHaveBeenCalledWith("group");
  });
});
