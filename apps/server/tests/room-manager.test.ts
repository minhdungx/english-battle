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

  it("accepts Mine Sweeper rooms", () => {
    const rooms = new RoomManager();
    const { room } = rooms.createRoom("Host", "socket-1", { gameMode: "MINE_SWEEPER" });

    expect(room.settings.gameMode).toBe("MINE_SWEEPER");
  });

  it("limits Mine Sweeper rooms to five players and blocks new players after the match starts", () => {
    const rooms = new RoomManager();
    const { room, playerToken } = rooms.createRoom("Host", "socket-1", { gameMode: "MINE_SWEEPER" });

    for (let index = 2; index <= 5; index += 1) {
      expect(rooms.joinRoom(room.code, `P${index}`, `socket-${index}`).success).toBe(true);
    }
    expect(rooms.joinRoom(room.code, "P6", "socket-6")).toMatchObject({ success: false, error: expect.stringContaining("tối đa") });

    room.status = "PLAYING";
    expect(rooms.joinRoom(room.code, "Late", "socket-late")).toMatchObject({ success: false, error: expect.stringContaining("đã bắt đầu") });
    expect(rooms.joinRoom(room.code, "Host", "socket-reconnect", playerToken)).toMatchObject({ success: true, isReconnect: true });
  });

  it("keeps a Mine Sweeper player as DNF when they leave during a match", () => {
    const rooms = new RoomManager();
    const { room } = rooms.createRoom("Host", "socket-1", { gameMode: "MINE_SWEEPER" });
    const joined = rooms.joinRoom(room.code, "Guest", "socket-2");
    room.status = "PLAYING";

    rooms.leaveRoom("socket-2");

    expect(room.players.get(joined.player!.id)).toMatchObject({ connected: false, forfeited: true });
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
