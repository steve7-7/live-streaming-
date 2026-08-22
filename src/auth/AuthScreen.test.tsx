import { render, screen } from "../test/render";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthScreen from "./AuthScreen";

const auth = vi.hoisted(() => ({
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./AuthContext", () => ({ useAuth: () => auth }));

beforeEach(() => vi.clearAllMocks());

describe("AuthScreen", () => {
  it("fills and submits the development demo account", async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(screen.getByRole("button", { name: /use demo account/i }));
    await user.click(screen.getAllByRole("button", { name: /^sign in$/i })[1]);

    expect(auth.login).toHaveBeenCalledWith("demo@streamly.local", "streamly-demo");
  });

  it("registers a new account", async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(screen.getByRole("button", { name: /sign up/i }));
    await user.type(screen.getByLabelText("Name"), "New Creator");
    await user.type(screen.getByLabelText("Handle"), "creator");
    await user.type(screen.getByLabelText("Email"), "creator@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(auth.register).toHaveBeenCalledWith({
      name: "New Creator",
      handle: "creator",
      email: "creator@example.com",
      password: "password123",
    });
  });
});
