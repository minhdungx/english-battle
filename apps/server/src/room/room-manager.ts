import {
  GAME_CONSTANTS,
  GameStatus,
  Player,
  PublicRoom,
  RoomSettings,
  RoomState,
  VOCABULARY_CATEGORIES,
  VOCABULARY_LEVELS,
} from "@bufobia/shared";
import { GameManager } from "../game/game-manager.js";

export interface GameRoom {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  tokens: Map<string, string>; // playerToken -> playerId
  socketToPlayer: Map<string, string>; // socketId -> playerId
  status: GameStatus;
  settings: RoomSettings;
  game: GameManager | null;
  disconnectTimers: Map<string, NodeJS.Timeout>; // playerId -> timer
  createdAt: number;
}

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();

  private validateSettings(settings: Partial<RoomSettings> | undefined): string | undefined {
    if (settings === undefined) return;
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return "Cài đặt phòng không hợp lệ";
    }

    if (settings.roundsCount !== undefined && ![5, 10, 15, 20].includes(settings.roundsCount)) {
      return "Số vòng chơi không hợp lệ";
    }
    if (settings.gameMode !== undefined && !["CLASSIC", "RACE", "AMAZING_RACE"].includes(settings.gameMode)) {
      return "Chế độ chơi không hợp lệ";
    }
    if (settings.roundDurationMs !== undefined && ![15000, 20000, 30000].includes(settings.roundDurationMs)) {
      return "Thời gian mỗi vòng không hợp lệ";
    }
    if (settings.raceDurationMs !== undefined && ![60000, 120000, 180000, 300000].includes(settings.raceDurationMs)) {
      return "Thời gian cuộc đua không hợp lệ";
    }
    if (settings.revealIntervalMs !== undefined && (!Number.isInteger(settings.revealIntervalMs) || settings.revealIntervalMs < 500 || settings.revealIntervalMs > 10000)) {
      return "Khoảng thời gian mở gợi ý không hợp lệ";
    }
    if (settings.level !== undefined && !VOCABULARY_LEVELS.includes(settings.level)) {
      return "Cấp độ từ vựng không hợp lệ";
    }
    if (settings.category !== undefined && !VOCABULARY_CATEGORIES.includes(settings.category)) {
      return "Chủ đề từ vựng không hợp lệ";
    }
  }

  public generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    do {
      code = "";
      for (let i = 0; i < GAME_CONSTANTS.ROOM_CODE_LENGTH; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  public generatePlayerToken(): string {
    return `tok_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
  }

  public createRoom(
    hostNickname: string,
    socketId: string,
    settings?: Partial<RoomSettings>,
    userId?: string
  ): { room: GameRoom; host: Player; playerToken: string } {
    const settingsError = this.validateSettings(settings);
    const code = this.generateRoomCode();
    const hostId = `p_${Math.random().toString(36).substring(2, 9)}`;
    const playerToken = this.generatePlayerToken();

    const host: Player = {
      id: hostId,
      userId,
      socketId,
      nickname: hostNickname.trim() || "Host",
      score: 0,
      ready: true,
      connected: true,
      correctCount: 0,
      raceProgress: 0,
      streak: 0,
      fireTurnsVisible: 0,
      stormActive: false,
      maxStreak: 0,
      totalResponseTimeMs: 0,
      isHost: true,
    };

    const defaultSettings: RoomSettings = {
      gameMode: "CLASSIC",
      roundsCount: GAME_CONSTANTS.DEFAULT_ROUNDS_COUNT,
      roundDurationMs: GAME_CONSTANTS.DEFAULT_ROUND_DURATION_MS,
      raceDurationMs: GAME_CONSTANTS.DEFAULT_RACE_DURATION_MS,
      revealIntervalMs: GAME_CONSTANTS.DEFAULT_REVEAL_INTERVAL_MS,
      level: "ALL",
      category: "ALL",
      ...(settingsError ? undefined : settings),
    };

    const room: GameRoom = {
      code,
      hostId,
      players: new Map([[hostId, host]]),
      tokens: new Map([[playerToken, hostId]]),
      socketToPlayer: new Map([[socketId, hostId]]),
      status: "LOBBY",
      settings: defaultSettings,
      game: null,
      disconnectTimers: new Map(),
      createdAt: Date.now(),
    };

    this.rooms.set(code, room);
    return { room, host, playerToken };
  }

  public joinRoom(
    roomCode: string,
    nickname: string,
    socketId: string,
    playerToken?: string,
    userId?: string
  ): {
    success: boolean;
    room?: GameRoom;
    player?: Player;
    playerToken?: string;
    isReconnect?: boolean;
    error?: string;
  } {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);

    if (!room) {
      return { success: false, error: "Phòng không tồn tại hoặc đã giải tán." };
    }

    // 1. Check reconnection with playerToken
    if (playerToken && room.tokens.has(playerToken)) {
      const playerId = room.tokens.get(playerToken)!;
      const player = room.players.get(playerId);

      if (player) {
        // Clear disconnect grace timer if running
        const existingTimer = room.disconnectTimers.get(playerId);
        if (existingTimer) {
          clearTimeout(existingTimer);
          room.disconnectTimers.delete(playerId);
        }

        // Remap socket
        room.socketToPlayer.delete(player.socketId);
        player.socketId = socketId;
        player.connected = true;
        room.socketToPlayer.set(socketId, playerId);

        return {
          success: true,
          room,
          player,
          playerToken,
          isReconnect: true,
        };
      }
    }

    // 2. Validate nickname
    const cleanNickname = nickname.trim();
    if (!cleanNickname || cleanNickname.length < 2 || cleanNickname.length > 20) {
      return { success: false, error: "Tên người chơi phải từ 2 đến 20 ký tự." };
    }

    // Check duplicate nickname
    const nameTaken = Array.from(room.players.values()).some(
      (p) => p.nickname.toLowerCase() === cleanNickname.toLowerCase() && p.connected
    );
    if (nameTaken) {
      return { success: false, error: "Tên người chơi này đã có người sử dụng trong phòng." };
    }

    // 3. Create new player
    const playerId = `p_${Math.random().toString(36).substring(2, 9)}`;
    const newToken = this.generatePlayerToken();

    const newPlayer: Player = {
      id: playerId,
      userId,
      socketId,
      nickname: cleanNickname,
      score: 0,
      ready: false,
      connected: true,
      correctCount: 0,
      raceProgress: 0,
      streak: 0,
      fireTurnsVisible: 0,
      stormActive: false,
      maxStreak: 0,
      totalResponseTimeMs: 0,
      isHost: false,
    };

    room.players.set(playerId, newPlayer);
    room.tokens.set(newToken, playerId);
    room.socketToPlayer.set(socketId, playerId);

    return {
      success: true,
      room,
      player: newPlayer,
      playerToken: newToken,
      isReconnect: false,
    };
  }

  public handleSocketDisconnect(
    socketId: string,
    onGraceExpired?: (room: GameRoom, playerId: string) => void
  ): { room?: GameRoom; player?: Player } {
    const room = this.getRoomBySocketId(socketId);
    if (!room) return {};

    const playerId = room.socketToPlayer.get(socketId);
    if (!playerId) return {};

    const player = room.players.get(playerId);
    if (!player) return {};

    player.connected = false;
    room.socketToPlayer.delete(socketId);

    // If room is in LOBBY, remove immediately or short grace period.
    // If room is PLAYING, give DISCONNECT_GRACE_PERIOD_MS.
    const graceMs =
      room.status === "LOBBY" ? 5000 : GAME_CONSTANTS.DISCONNECT_GRACE_PERIOD_MS;

    const timer = setTimeout(() => {
      room.disconnectTimers.delete(playerId);
      // If player still not connected
      if (!player.connected) {
        room.players.delete(playerId);
        // Clean tokens
        for (const [t, pId] of room.tokens.entries()) {
          if (pId === playerId) {
            room.tokens.delete(t);
          }
        }

        // Host migration if host left
        if (player.isHost) {
          this.migrateHost(room);
        }

        // If no connected players left, delete room
        if (Array.from(room.players.values()).every((p) => !p.connected)) {
          this.destroyRoom(room.code);
        }

        if (onGraceExpired) {
          onGraceExpired(room, playerId);
        }
      }
    }, graceMs);

    room.disconnectTimers.set(playerId, timer);

    // If host disconnects, tentatively elect active host if in lobby
    if (player.isHost && room.status === "LOBBY") {
      this.migrateHost(room);
    }

    return { room, player };
  }

  public leaveRoom(socketId: string): { room?: GameRoom; player?: Player } {
    const room = this.getRoomBySocketId(socketId);
    if (!room) return {};

    const playerId = room.socketToPlayer.get(socketId);
    if (!playerId) return {};

    const player = room.players.get(playerId);
    if (!player) return {};

    // Clear timers
    const timer = room.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      room.disconnectTimers.delete(playerId);
    }

    room.socketToPlayer.delete(socketId);
    room.players.delete(playerId);
    for (const [t, pId] of room.tokens.entries()) {
      if (pId === playerId) {
        room.tokens.delete(t);
      }
    }

    if (player.isHost) {
      this.migrateHost(room);
    }

    if (room.players.size === 0) {
      this.destroyRoom(room.code);
    }

    return { room, player };
  }

  public migrateHost(room: GameRoom): Player | null {
    const connectedPlayers = Array.from(room.players.values()).filter(
      (p) => p.connected
    );
    if (connectedPlayers.length === 0) return null;

    // Reset old host flags
    for (const p of room.players.values()) {
      p.isHost = false;
    }

    const nextHost = connectedPlayers[0];
    nextHost.isHost = true;
    nextHost.ready = true;
    room.hostId = nextHost.id;
    return nextHost;
  }

  public setReady(socketId: string, ready: boolean): { room?: GameRoom; player?: Player } {
    const room = this.getRoomBySocketId(socketId);
    if (!room) return {};

    const playerId = room.socketToPlayer.get(socketId);
    if (!playerId) return {};

    const player = room.players.get(playerId);
    if (!player) return {};

    player.ready = ready;
    return { room, player };
  }

  public updateSettings(
    socketId: string,
    newSettings: Partial<RoomSettings>
  ): { success: boolean; room?: GameRoom; error?: string } {
    const room = this.getRoomBySocketId(socketId);
    if (!room) return { success: false, error: "Phòng không tồn tại" };

    const playerId = room.socketToPlayer.get(socketId);
    if (!playerId || playerId !== room.hostId) {
      return { success: false, error: "Chỉ Host mới có quyền thay đổi cài đặt phòng" };
    }

    if (room.status !== "LOBBY") {
      return { success: false, error: "Không thể đổi cài đặt khi trận đấu đang diễn ra" };
    }

    const settingsError = this.validateSettings(newSettings);
    if (settingsError) return { success: false, error: settingsError };

    room.settings = {
      ...room.settings,
      ...newSettings,
    };

    return { success: true, room };
  }

  public getRoomByCode(code: string): GameRoom | undefined {
    return this.rooms.get(code.toUpperCase().trim());
  }

  public getRoomBySocketId(socketId: string): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.socketToPlayer.has(socketId)) {
        return room;
      }
    }
    return undefined;
  }

  public getPublicRooms(): PublicRoom[] {
    return Array.from(this.rooms.values())
      .filter((room) => room.status !== "GAME_RESULT")
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((room) => ({
        code: room.code,
        hostNickname: room.players.get(room.hostId)?.nickname || "Host",
        playerCount: Array.from(room.players.values()).filter((player) => player.connected).length,
        status: room.status,
        settings: room.settings,
        currentRound: room.game?.currentRoundIndex ?? 0,
        totalRounds: room.game?.totalRounds ?? room.settings.roundsCount,
      }));
  }

  public getSystemStats(): { activeRooms: number; connectedPlayers: number; gamesInProgress: number } {
    const rooms = Array.from(this.rooms.values());
    return {
      activeRooms: rooms.length,
      connectedPlayers: rooms.reduce((total, room) => total + Array.from(room.players.values()).filter((player) => player.connected).length, 0),
      gamesInProgress: rooms.filter((room) => room.status === "PLAYING" || room.status === "ROUND_RESULT").length,
    };
  }

  public destroyRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room) {
      if (room.game) {
        room.game.clearTimers();
      }
      for (const timer of room.disconnectTimers.values()) {
        clearTimeout(timer);
      }
      this.rooms.delete(code);
    }
  }

  public toRoomState(room: GameRoom, playerId?: string): RoomState {
    const playersList = Array.from(room.players.values());
    return {
      code: room.code,
      hostId: room.hostId,
      players: playersList,
      status: room.status,
      currentRound: room.game?.currentRoundIndex ?? 0,
      totalRounds: room.game?.totalRounds ?? room.settings.roundsCount,
      settings: room.settings,
      round: room.game?.isRaceMode()
        ? (playerId ? room.game.getRaceRound(playerId)?.getPublicInfo() : undefined)
        : room.game?.currentRound?.getPublicInfo(),
      raceEndsAt: room.game?.raceEndsAt,
    };
  }
}
