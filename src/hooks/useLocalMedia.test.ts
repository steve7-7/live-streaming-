import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLocalMedia } from "./useLocalMedia";

const originalMediaDevices = navigator.mediaDevices;

afterEach(() => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: originalMediaDevices,
  });
});

describe("useLocalMedia", () => {
  it("acquires tracks, applies control state, and stops them on cleanup", async () => {
    const videoTrack = { enabled: true, stop: vi.fn() };
    const audioTrack = { enabled: true, stop: vi.fn() };
    const stream = {
      getTracks: () => [videoTrack, audioTrack],
      getVideoTracks: () => [videoTrack],
      getAudioTracks: () => [audioTrack],
    } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });

    const { result, rerender, unmount } = renderHook(
      ({ camOn, micOn }) => useLocalMedia({ enabled: true, camOn, micOn, facing: "user" }),
      { initialProps: { camOn: true, micOn: true } }
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ video: expect.any(Object), audio: expect.any(Object) })
    );

    rerender({ camOn: false, micOn: false });
    expect(videoTrack.enabled).toBe(false);
    expect(audioTrack.enabled).toBe(false);

    unmount();
    expect(videoTrack.stop).toHaveBeenCalled();
    expect(audioTrack.stop).toHaveBeenCalled();
  });

  it("reports denied permission and can retry", async () => {
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"))
      .mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"));
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });

    const { result } = renderHook(() =>
      useLocalMedia({ enabled: true, camOn: true, micOn: true, facing: "user" })
    );
    await waitFor(() => expect(result.current.status).toBe("denied"));

    act(() => result.current.retry());
    expect(result.current.status).toBe("requesting");
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
  });
});
