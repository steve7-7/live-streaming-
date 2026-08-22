import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { authStorage } from "./authStorage";

const user = {
  id: "me",
  name: "You",
  handle: "@you",
  avatar: "",
  color: "#8b5cf6",
  status: "online" as const,
  followers: 10,
};

beforeEach(() => {
  authStorage.clear();
  vi.restoreAllMocks();
});

describe("API authentication", () => {
  it("rotates tokens and retries once after an expired access token", async () => {
    authStorage.save({ accessToken: "expired", refreshToken: "refresh-one" });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "expired" }), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: "access-two", refreshToken: "refresh-two" }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(user), { status: 200 }));

    await expect(api.session()).resolves.toEqual(user);
    expect(authStorage.accessToken()).toBe("access-two");
    expect(authStorage.refreshToken()).toBe("refresh-two");
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get("Authorization")).toBe(
      "Bearer access-two"
    );
  });
});
