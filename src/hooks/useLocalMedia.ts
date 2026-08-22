import { useEffect, useRef, useState } from "react";

export type MediaStatus = "idle" | "requesting" | "ready" | "denied" | "unavailable" | "error";

export function useLocalMedia({
  enabled,
  camOn,
  micOn,
  facing,
}: {
  enabled: boolean;
  camOn: boolean;
  micOn: boolean;
  facing: "user" | "environment";
}) {
  const mediaSupported = Boolean(navigator.mediaDevices?.getUserMedia);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<MediaStatus>(
    enabled ? (mediaSupported ? "requesting" : "unavailable") : "idle"
  );
  const [error, setError] = useState(
    enabled && !mediaSupported
      ? "Camera and microphone access is not available in this browser."
      : ""
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || !navigator.mediaDevices?.getUserMedia) return;

    let cancelled = false;
    let acquired: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      .then((nextStream) => {
        acquired = nextStream;
        if (cancelled) {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream(nextStream);
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        const mediaError = cause as DOMException;
        const denied = mediaError.name === "NotAllowedError" || mediaError.name === "SecurityError";
        setStatus(denied ? "denied" : "error");
        setError(
          denied
            ? "Allow camera and microphone access in your browser to preview your stream."
            : mediaError.message || "Your camera or microphone could not be started."
        );
      });

    return () => {
      cancelled = true;
      acquired?.getTracks().forEach((track) => track.stop());
      setStream((current) => {
        if (current === acquired) return null;
        return current;
      });
    };
  }, [attempt, enabled, facing]);

  useEffect(() => {
    stream?.getVideoTracks().forEach((track) => (track.enabled = camOn));
  }, [camOn, stream]);

  useEffect(() => {
    stream?.getAudioTracks().forEach((track) => (track.enabled = micOn));
  }, [micOn, stream]);

  return {
    stream,
    status,
    error,
    retry: () => {
      setStatus(mediaSupported ? "requesting" : "unavailable");
      setError(
        mediaSupported ? "" : "Camera and microphone access is not available in this browser."
      );
      setAttempt((value) => value + 1);
    },
  };
}

export function useAudioLevel(stream: MediaStream | null, enabled: boolean, bars = 18) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const track = stream?.getAudioTracks()[0];
    if (!enabled || !track) return;

    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const source = context.createMediaStreamSource(new MediaStream([track]));
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;

    const measure = () => {
      analyser.getByteFrequencyData(samples);
      const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      setLevel(Math.min(bars, Math.round((average / 110) * bars)));
      frame = requestAnimationFrame(measure);
    };
    measure();

    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      void context.close();
    };
  }, [bars, enabled, stream]);

  return enabled && stream?.getAudioTracks()[0] ? level : 0;
}

export function useDisplayMedia(enabled: boolean, onEnded: () => void) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      Promise.resolve().then(() => {
        setError("Screen sharing is not supported in this browser.");
        onEndedRef.current();
      });
      return;
    }

    let cancelled = false;
    let acquired: MediaStream | null = null;
    navigator.mediaDevices
      .getDisplayMedia({ video: true, audio: true })
      .then((nextStream) => {
        acquired = nextStream;
        if (cancelled) {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }
        nextStream.getVideoTracks()[0]?.addEventListener("ended", () => onEndedRef.current(), {
          once: true,
        });
        setStream(nextStream);
        setError("");
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        const displayError = cause as DOMException;
        setError(
          displayError.name === "NotAllowedError"
            ? "Screen sharing was cancelled."
            : displayError.message || "The screen could not be shared."
        );
        onEndedRef.current();
      });

    return () => {
      cancelled = true;
      acquired?.getTracks().forEach((track) => track.stop());
      setStream((current) => (current === acquired ? null : current));
    };
  }, [enabled]);

  return { stream, error };
}
