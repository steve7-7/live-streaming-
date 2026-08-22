import { renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useLiveKitRoom } from "./useLiveKitRoom";

it("stays disabled when no LiveKit URL is configured", () => {
  const { result } = renderHook(() =>
    useLiveKitRoom({
      roomId: "demo-room",
      role: "watch",
      localStream: null,
      screenSharing: false,
    })
  );

  expect(result.current.enabled).toBe(false);
  expect(result.current.status).toBe("disabled");
  expect(result.current.remoteStreams).toEqual({});
  expect(result.current.remoteParticipants).toEqual({});
});
