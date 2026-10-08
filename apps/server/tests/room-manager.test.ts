import { describe, expect, it } from "vitest";
import { RoomManager } from "../src/room/room-manager.js";

describe("room-manager", () => {
  it("rejects invalid settings and preserves safe defaults", () => {
    const rooms = new RoomManager();
    const { room } = rooms.createRoom("Host", "socket-1", {
      roundDurationMs: 1,
      revealIntervalMs: 0,
    });

    expect(room.settings.roundDurationMs).toBe(20000);
    expect(room.settings.revealIntervalMs).toBe(3000);
    expect(rooms.updateSettings("socket-1", { roundsCount: 999 })).toMatchObject({
      success: false,
    });
  });

  it("allows a new player to join an active room", () => {
    const rooms = new RoomManager();
    const { room } = rooms.createRoom("Host", "socket-1");
    room.status = "PLAYING";

    expect(rooms.joinRoom(room.code, "Guest", "socket-2")).toMatchObject({
      success: true,
    });
  });

  it("accepts the race mode but rejects unknown game modes", () => {
    const rooms = new RoomManager();
    const { room } = rooms.createRoom("Host", "socket-1", { gameMode: "RACE" });

    expect(room.settings.gameMode).toBe("RACE");
    expect(rooms.updateSettings("socket-1", { gameMode: "UNKNOWN" as never })).toMatchObject({ success: false });
  });

  it("lists joinable rooms without exposing player details", () => {
    const rooms = new RoomManager();
    const { room } = rooms.createRoom("Host", "socket-1");
    rooms.joinRoom(room.code, "Guest", "socket-2");

    expect(rooms.getPublicRooms()).toEqual([
      expect.objectContaining({
        code: room.code,
        hostNickname: "Host",
        playerCount: 2,
        status: "LOBBY",
      }),
    ]);
  });
});
