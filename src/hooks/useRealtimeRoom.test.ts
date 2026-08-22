import { renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useRealtimeRoom } from "./useRealtimeRoom";

it("keeps the realtime transport disabled behind its feature flag", () => {
  const { result } = renderHook(() => useRealtimeRoom("s1"));
  expect(result.current.enabled).toBe(false);
  expect(result.current.connected).toBe(false);
  expect(result.current.messages).toEqual([]);
  expect(result.current.reactions).toEqual([]);
});
