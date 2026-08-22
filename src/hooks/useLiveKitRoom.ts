import { useEffect, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client";
import { config } from "../config";
import { api } from "../lib/api";

export type LiveRoomStatus = "disabled" | "connecting" | "connected" | "error";

export function useLiveKitRoom({
  roomId,
  role,
  localStream,
  screenSharing,
}: {
  roomId: string;
  role: "watch" | "publish";
  localStream: MediaStream | null;
  screenSharing: boolean;
}) {
  const enabled = Boolean(config.livekitUrl);
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState<LiveRoomStatus>(enabled ? "connecting" : "disabled");
  const [error, setError] = useState("");
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [remoteParticipants, setRemoteParticipants] = useState<
    Record<string, { id: string; name: string }>
  >({});

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const nextRoom = new Room({ adaptiveStream: true, dynacast: true });

    const rememberParticipant = (participant: RemoteParticipant) => {
      setRemoteParticipants((current) => ({
        ...current,
        [participant.identity]: {
          id: participant.identity,
          name: participant.name || `Guest ${participant.identity.slice(-4)}`,
        },
      }));
    };
    const addTrack = (
      track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      rememberParticipant(participant);
      setRemoteStreams((current) => {
        const nextStream = new MediaStream(current[participant.identity]?.getTracks() ?? []);
        if (!nextStream.getTracks().some((item) => item.id === track.mediaStreamTrack.id)) {
          nextStream.addTrack(track.mediaStreamTrack);
        }
        return { ...current, [participant.identity]: nextStream };
      });
    };
    const removeTrack = (
      track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      setRemoteStreams((current) => {
        const existing = current[participant.identity];
        if (!existing) return current;
        const nextStream = new MediaStream(
          existing.getTracks().filter((item) => item.id !== track.mediaStreamTrack.id)
        );
        const next = { ...current };
        if (nextStream.getTracks().length) next[participant.identity] = nextStream;
        else delete next[participant.identity];
        return next;
      });
    };
    const removeParticipant = (participant: RemoteParticipant) => {
      setRemoteStreams((current) => {
        const next = { ...current };
        delete next[participant.identity];
        return next;
      });
      setRemoteParticipants((current) => {
        const next = { ...current };
        delete next[participant.identity];
        return next;
      });
    };

    nextRoom.on(RoomEvent.ParticipantConnected, rememberParticipant);
    nextRoom.on(RoomEvent.TrackSubscribed, addTrack);
    nextRoom.on(RoomEvent.TrackUnsubscribed, removeTrack);
    nextRoom.on(RoomEvent.ParticipantDisconnected, removeParticipant);

    api
      .liveToken(roomId, role)
      .then(({ token }) => nextRoom.connect(config.livekitUrl, token))
      .then(() => {
        if (cancelled) {
          void nextRoom.disconnect();
          return;
        }
        nextRoom.remoteParticipants.forEach(rememberParticipant);
        setRoom(nextRoom);
        setStatus("connected");
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setError(cause instanceof Error ? cause.message : "The live room could not be connected.");
      });

    return () => {
      cancelled = true;
      setRoom(null);
      setRemoteStreams({});
      setRemoteParticipants({});
      void nextRoom.disconnect();
    };
  }, [enabled, role, roomId]);

  useEffect(() => {
    if (!room || role !== "publish" || !localStream) return;
    const tracks = localStream.getTracks();
    let cancelled = false;

    Promise.all(
      tracks.map((track) =>
        room.localParticipant.publishTrack(track, {
          source:
            track.kind === "audio"
              ? Track.Source.Microphone
              : screenSharing
                ? Track.Source.ScreenShare
                : Track.Source.Camera,
        })
      )
    ).catch((cause: unknown) => {
      if (!cancelled) {
        setStatus("error");
        setError(cause instanceof Error ? cause.message : "Local media could not be published.");
      }
    });

    return () => {
      cancelled = true;
      tracks.forEach((track) => void room.localParticipant.unpublishTrack(track, false));
    };
  }, [localStream, role, room, screenSharing]);

  return { enabled, status, error, remoteStreams, remoteParticipants };
}
