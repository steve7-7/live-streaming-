import { Route, Routes } from "react-router-dom";
import { render, screen } from "../test/render";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { streams, users } from "../data";
import PublicProfile from "./PublicProfile";

vi.mock("../auth/AuthContext", () => ({ useAuth: () => ({ user: { id: "viewer" } }) }));

const mount = () => {
  const onWatch = vi.fn();
  render(
    <Routes>
      <Route path="/u/:handle" element={<PublicProfile onWatch={onWatch} />} />
    </Routes>,
    { route: "/u/arianova" }
  );
  return onWatch;
};

describe("PublicProfile", () => {
  it("renders a shareable creator profile and its streams", () => {
    mount();
    expect(screen.getByRole("heading", { name: users[0].name })).toBeInTheDocument();
    const creatorStreams = streams.filter((stream) => stream.host.id === users[0].id);
    for (const stream of creatorStreams) expect(screen.getByText(stream.title)).toBeInTheDocument();
  });

  it("can follow the creator and open a stream", async () => {
    const interaction = userEvent.setup();
    const onWatch = mount();
    await interaction.click(screen.getByRole("button", { name: "Follow" }));
    expect(screen.getByRole("button", { name: /Following/ })).toBeInTheDocument();

    const stream = streams.find((item) => item.host.id === users[0].id)!;
    await interaction.click(screen.getByRole("button", { name: new RegExp(stream.title) }));
    expect(onWatch).toHaveBeenCalledWith(stream);
  });
});
