import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  GAME_CONSTANTS,
  RoomSettings,
} from "@bufobia/shared";
import { RoomManager, GameRoom } from "../room/room-manager.js";
import { VocabularyService } from "../vocabulary/service.js";
import { GameManager } from "../game/game-manager.js";
import { UserStore } from "../auth/user-store.js";
import type { AuthUser } from "../auth/user-store.js";

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager,
  vocabularyService: VocabularyService,
  userStore: UserStore,
  getSessionUser: (headers: Headers | import("node:http").IncomingHttpHeaders) => Promise<AuthUser | undefined>
) {
  function getRoomChannel(code: string): string {
    return `room:${code}`;
  }

  function getSocketHeaders(socket: Socket, authToken?: string): Headers {
    const headers = new Headers();
    for (const [key, value] of Object.entries(socket.handshake.headers)) {
      if (typeof value === "string") headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(", "));
    }
    if (authToken) headers.set("authorization", `Bearer ${authToken}`);
    return headers;
  }

  function broadcastRoomState(room: GameRoom) {
    if (room.game?.isRaceMode()) {
      for (const player of room.players.values()) {
        io.to(player.socketId).emit("room:state", roomManager.toRoomState(room, player.id));
      }
    } else {
      io.to(getRoomChannel(room.code)).emit("room:state", roomManager.toRoomState(room));
    }
    io.emit("rooms:update", roomManager.getPublicRooms());
  }

  function runRound(room: GameRoom, roundNumber: number) {
    if (!room.game) return;

    room.status = "PLAYING";
    const round = room.game.startRound(roundNumber, room.settings.roundDurationMs);

    broadcastRoomState(room);
    io.to(getRoomChannel(room.code)).emit("round:start", round.getPublicInfo());

    // Setup progressive hint reveal timer
    room.game.hintIntervalTimer = setInterval(() => {
      if (room.status !== "PLAYING" || !room.game?.currentRound) {
        if (room.game?.hintIntervalTimer) {
          clearInterval(room.game.hintIntervalTimer);
          room.game.hintIntervalTimer = null;
        }
        return;
      }

      const hint = room.game.currentRound.revealNextHint();
      if (hint) {
        io.to(getRoomChannel(room.code)).emit("round:hint", {
          roundId: room.game.currentRound.roundId,
          position: hint.position,
          character: hint.character,
          revealedCount: hint.revealedCount,
        });
      } else {
        // No more hints can be revealed for this word
        if (room.game.hintIntervalTimer) {
          clearInterval(room.game.hintIntervalTimer);
          room.game.hintIntervalTimer = null;
        }
      }
    }, room.settings.revealIntervalMs);

    // Setup round duration timeout
    room.game.roundIntervalTimer = setTimeout(() => {
      endRound(room);
    }, room.settings.roundDurationMs);
  }

  function endRound(room: GameRoom) {
    if (!room.game || room.status !== "PLAYING") return;

    room.game.clearTimers();
    room.status = "ROUND_RESULT";

    const currentRound = room.game.currentRound;
    if (!currentRound) return;

    const playersList = Array.from(room.players.values());
    room.game.finalizeRoundStreaks(playersList);

    const endPayload = currentRound.buildEndPayload(
      playersList,
      GAME_CONSTANTS.ROUND_RESULT_DURATION_MS
    );

    io.to(getRoomChannel(room.code)).emit("round:end", endPayload);
    broadcastRoomState(room);

    // Schedule next round or game over
    room.game.roundIntervalTimer = setTimeout(() => {
      if (!room.game) return;

      if (room.game.isLastRound()) {
        endGame(room);
      } else {
        runRound(room, room.game.currentRoundIndex + 1);
      }
    }, GAME_CONSTANTS.ROUND_RESULT_DURATION_MS);
  }

  function startRaceRound(room: GameRoom, playerId: string) {
    const game = room.game;
    const player = room.players.get(playerId);
    if (!game || !player || room.status !== "PLAYING" || !game.isRaceMode()) return;

    const round = game.startRaceRound(player.id, player.correctCount);
    if (!round) return;

    io.to(player.socketId).emit("round:start", round.getPublicInfo());

    const hintTimer = setInterval(() => {
      if (room.status !== "PLAYING" || game.getRaceRound(player.id)?.roundId !== round.roundId) {
        game.clearRacePlayerTimers(player.id);
        return;
      }

      const hint = round.revealNextHint();
      if (!hint) {
        const timer = game.raceHintTimers.get(player.id);
        if (timer) clearInterval(timer);
        game.raceHintTimers.delete(player.id);
        return;
      }
      io.to(player.socketId).emit("round:hint", {
        roundId: round.roundId,
        position: hint.position,
        character: hint.character,
        revealedCount: hint.revealedCount,
      });
    }, room.settings.revealIntervalMs);
    game.raceHintTimers.set(player.id, hintTimer);

    const pronunciation = round.vocabulary.pronunciation;
    if (pronunciation && round.durationMs > 0) {
      const extraHintTimer = setTimeout(() => {
        if (room.status !== "PLAYING" || game.getRaceRound(player.id)?.roundId !== round.roundId) return;
        io.to(player.socketId).emit("round:extra-hint", {
          roundId: round.roundId,
          pronunciation,
        });
      }, round.durationMs / 2);
      game.raceExtraHintTimers.set(player.id, extraHintTimer);
    }

    if (round.durationMs > 0) {
      const roundTimer = setTimeout(() => {
        if (game.getRaceRound(player.id)?.roundId !== round.roundId || room.status !== "PLAYING") return;
        game.resetPlayerStreak(player);
        io.to(player.socketId).emit("race:answer-reveal", {
          roundId: round.roundId,
          answer: round.vocabulary.word.toUpperCase(),
          meaning: round.vocabulary.meaning,
          pronunciation: round.vocabulary.pronunciation,
        });
        startRaceRound(room, player.id);
      }, round.durationMs);
      game.raceRoundTimers.set(player.id, roundTimer);
    }

    broadcastRoomState(room);
  }

  function runRace(room: GameRoom) {
    const game = room.game;
    if (!game) return;

    room.status = "PLAYING";
    const activePlayers = Array.from(room.players.values()).filter((player) => player.connected);
    const raceEndsAt = game.gameMode === "RACE" ? Date.now() + room.settings.raceDurationMs : undefined;
    game.initializeRace(activePlayers.map((player) => player.id), raceEndsAt);
    if (raceEndsAt) {
      game.raceTimer = setTimeout(() => endGame(room), Math.max(0, raceEndsAt - Date.now()));
    }

    for (const player of activePlayers) {
      startRaceRound(room, player.id);
    }
  }

  async function endGame(room: GameRoom) {
    if (!room.game) return;

    room.game.clearTimers();
    room.status = "GAME_RESULT";

    const playersList = Array.from(room.players.values());
    const endPayload = room.game.buildGameEndPayload(playersList);
    await Promise.all(endPayload.leaderboard.filter((entry) => !entry.forfeited).map((entry, index) => {
      const player = room.players.get(entry.playerId);
      return userStore.awardExperience(player?.userId, Math.max(10, 100 - index * 20));
    }));

    io.to(getRoomChannel(room.code)).emit("game:end", endPayload);
    broadcastRoomState(room);
  }

  function endMineSweeperIfSettled(room: GameRoom): boolean {
    if (
      room.status !== "PLAYING" ||
      !room.game?.isMineSweeper() ||
      !room.game.isMineSweeperSettled(Array.from(room.players.values()))
    ) {
      return false;
    }
    void endGame(room);
    return true;
  }

  function syncRoom(room: GameRoom) {
    if (room.game?.isRaceMode()) {
      if (room.status === "PLAYING" && room.game.raceEndsAt && room.game.raceEndsAt <= Date.now()) endGame(room);
      else broadcastRoomState(room);
      return;
    }
    if (room.status === "PLAYING" && room.game?.currentRound?.isExpired()) {
      endRound(room);
    } else {
      broadcastRoomState(room);
    }
  }

  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    socket.emit("rooms:update", roomManager.getPublicRooms());

    socket.on("rooms:list", (callback) => {
      callback?.(roomManager.getPublicRooms());
    });

    // 1. Create Room
    socket.on("room:create", async ({ nickname, settings, authToken }, callback) => {
      try {
        const user = await getSessionUser(getSocketHeaders(socket, authToken));
        if (!user) return callback?.({ success: false, error: "Vui lòng đăng nhập để chơi." });
        const { room, host, playerToken } = roomManager.createRoom(
          user.name,
          socket.id,
          settings,
          user.id
        );

        socket.join(getRoomChannel(room.code));

        if (callback) {
          callback({
            success: true,
            roomCode: room.code,
            playerToken,
          });
        }

        broadcastRoomState(room);
      } catch (err: any) {
        if (callback) {
          callback({ success: false, error: err.message || "Không thể tạo phòng" });
        }
      }
    });

    // 2. Join Room
    socket.on("room:join", async ({ roomCode, nickname, playerToken, authToken }, callback) => {
      const user = await getSessionUser(getSocketHeaders(socket, authToken));
      if (!user) return callback?.({ success: false, error: "Vui lòng đăng nhập để chơi." });
      const result = roomManager.joinRoom(roomCode, user.name, socket.id, playerToken, user.id);

      if (!result.success || !result.room || !result.player) {
        if (callback) {
          callback({ success: false, error: result.error || "Không thể vào phòng" });
        }
        return;
      }

      socket.join(getRoomChannel(result.room.code));

      if (callback) {
        callback({
          success: true,
          roomCode: result.room.code,
          playerToken: result.playerToken,
          playerId: result.player.id,
        });
      }

      if (
        result.room.status === "PLAYING" &&
        result.room.game?.isRaceMode() &&
        !result.room.game.getRaceRound(result.player.id)
      ) {
        startRaceRound(result.room, result.player.id);
      } else {
        syncRoom(result.room);
      }
    });

    // 3. Leave Room
    socket.on("room:leave", () => {
      const { room } = roomManager.leaveRoom(socket.id);
      if (room) {
        socket.leave(getRoomChannel(room.code));
        if (!endMineSweeperIfSettled(room)) broadcastRoomState(room);
      }
    });

    // 4. Update Settings
    socket.on("room:update-settings", (newSettings) => {
      const result = roomManager.updateSettings(socket.id, newSettings);
      if (result.success && result.room) {
        broadcastRoomState(result.room);
      } else if (result.error) {
        socket.emit("error:message", { message: result.error });
      }
    });

    // 5. Player Ready
    socket.on("player:ready", ({ ready }) => {
      const { room } = roomManager.setReady(socket.id, ready);
      if (room) {
        broadcastRoomState(room);
      }
    });

    // 6. Start Game
    socket.on("game:start", () => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room) return;

      const playerId = room.socketToPlayer.get(socket.id);
      if (playerId !== room.hostId) {
        socket.emit("error:message", { message: "Chỉ Host mới có quyền bắt đầu trận đấu" });
        return;
      }

      if (room.status !== "LOBBY") {
        socket.emit("error:message", { message: "Trận đấu đang diễn ra" });
        return;
      }

      const connectedPlayers = Array.from(room.players.values()).filter((p) => p.connected);
      if (connectedPlayers.length === 0) {
        socket.emit("error:message", { message: "Cần ít nhất 1 người chơi để bắt đầu" });
        return;
      }

      // Check if non-host players are ready (if more than 1 player)
      if (connectedPlayers.length > 1) {
        const nonHostNotReady = connectedPlayers.some((p) => !p.isHost && !p.ready);
        if (nonHostNotReady) {
          socket.emit("error:message", { message: "Tất cả người chơi phải bấm Sẵn sàng" });
          return;
        }
      }

      // Reset players scores and stats for fresh match
      for (const player of room.players.values()) {
        player.score = 0;
        player.correctCount = 0;
        player.raceProgress = 0;
        player.fireTurnsVisible = 0;
        player.stormActive = false;
        player.streak = 0;
        player.maxStreak = 0;
        player.totalResponseTimeMs = 0;
        player.completionTimeMs = undefined;
        player.forfeited = false;
      }

      // Prepare words
      const words = vocabularyService.getRandomWords(
        room.settings.gameMode === "RACE" ? 1000 : room.settings.roundsCount,
        {
        level: room.settings.level,
        category: room.settings.category,
        }
      );

      if (words.length === 0) {
        socket.emit("error:message", { message: "Không tìm thấy từ vựng phù hợp với cài đặt này" });
        return;
      }

      room.game = new GameManager(words, room.settings);
      room.status = "COUNTDOWN";
      broadcastRoomState(room);

      // Short countdown keeps the lobby-to-match transition snappy.
      let count = 2;
      io.to(getRoomChannel(room.code)).emit("game:countdown", { count, text: "Chuẩn bị..." });

      room.game.roundIntervalTimer = setInterval(() => {
        count -= 1;
        if (count > 0) {
          io.to(getRoomChannel(room.code)).emit("game:countdown", { count });
        } else if (count === 0) {
          io.to(getRoomChannel(room.code)).emit("game:countdown", { count: 0, text: "BẮT ĐẦU!" });
        } else {
          clearInterval(room.game!.roundIntervalTimer!);
          room.game!.roundIntervalTimer = null;
          if (room.game!.isRaceMode()) runRace(room);
          else runRound(room, 1);
        }
      }, 1000);
    });

    socket.on("room:sync", () => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (room) syncRoom(room);
    });

    // 7. Submit Answer
    socket.on("answer:submit", ({ roundId, answer }, callback) => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room || room.status !== "PLAYING" || !room.game) {
        if (callback) {
          callback({ correct: false, score: 0, message: "Round không ở trạng thái nhận đáp án" });
        }
        return;
      }

      const playerId = room.socketToPlayer.get(socket.id);
      if (!playerId) return;

      const currentRound = room.game.isRaceMode()
        ? room.game.getRaceRound(playerId)
        : room.game.currentRound;
      if (!currentRound || currentRound.roundId !== roundId) {
        if (callback) {
          callback({ correct: false, score: 0, message: "Mã round không trùng khớp" });
        }
        return;
      }

      const player = room.players.get(playerId);
      if (!player) return;

      const submission = currentRound.submitAnswer(playerId, answer);

      if (submission.isCorrect) {
        if (callback) {
          callback({
            correct: true,
            score: submission.score,
            responseTimeMs: submission.responseTimeMs,
            alreadyAnswered: submission.alreadyAnswered,
          });
        }

        if (submission.alreadyAnswered) return;

        if (room.game.isRaceMode()) {
          const raceAdvance = room.game.recordRaceCorrectAnswer(
            player,
            submission.score,
            submission.responseTimeMs || 0,
            currentRound.vocabulary.word,
            currentRound.durationMs
          );
          io.to(getRoomChannel(room.code)).emit("player:answered", {
            playerId: player.id,
            nickname: player.nickname,
            isCorrect: true,
            responseTimeMs: submission.responseTimeMs,
            raceProgressDelta: raceAdvance.distance,
            comebackBonus: raceAdvance.comebackBonus,
          });
        } else {
          room.game.recordCorrectAnswer(
            player,
            submission.score,
            submission.responseTimeMs || 0,
            currentRound.vocabulary.word
          );
        }

        if (!room.game.isRaceMode()) {
          io.to(getRoomChannel(room.code)).emit("player:answered", {
            playerId: player.id,
            nickname: player.nickname,
            isCorrect: true,
            responseTimeMs: submission.responseTimeMs,
          });
        }

        if (room.game.isRaceMode()) {
          io.to(player.socketId).emit("race:answer-reveal", {
            roundId: currentRound.roundId,
            answer: currentRound.vocabulary.word.toUpperCase(),
            meaning: currentRound.vocabulary.meaning,
            pronunciation: currentRound.vocabulary.pronunciation,
          });
          if (room.game.isMineSweeper() && player.correctCount >= room.game.totalRounds) {
            player.completionTimeMs = Date.now() - (room.game.raceStartedAt ?? Date.now());
            room.game.clearRacePlayerTimers(player.id);
            if (!endMineSweeperIfSettled(room)) broadcastRoomState(room);
          } else if (!room.game.raceEndsAt && player.correctCount >= room.game.totalRounds) {
            endGame(room);
          } else {
            broadcastRoomState(room);
            startRaceRound(room, player.id);
          }
          return;
        }

        broadcastRoomState(room);

        // If all connected active players answered correctly, finish round immediately
        const activePlayerIds = Array.from(room.players.values())
          .filter((p) => p.connected)
          .map((p) => p.id);

        if (currentRound.areAllPlayersCorrect(activePlayerIds)) {
          endRound(room);
        }
      } else {
        if (room.game.isRaceMode() && !submission.cooldown) {
          room.game.resetPlayerStreak(player);
          broadcastRoomState(room);
        }
        if (callback) {
          callback({
            correct: false,
            score: 0,
            cooldown: submission.cooldown,
            message: submission.message,
          });
        }
      }
    });

    // 8. Play Again
    socket.on("game:play-again", () => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room) return;

      const playerId = room.socketToPlayer.get(socket.id);
      if (playerId !== room.hostId) {
        socket.emit("error:message", { message: "Chỉ Host mới có quyền chọn Chơi lại" });
        return;
      }

      if (room.status !== "GAME_RESULT") return;

      if (room.game) {
        room.game.clearTimers();
        room.game = null;
      }

      room.status = "LOBBY";
      for (const [playerId, player] of room.players.entries()) {
        if (!player.connected) {
          room.players.delete(playerId);
          for (const [token, tokenPlayerId] of room.tokens.entries()) {
            if (tokenPlayerId === playerId) room.tokens.delete(token);
          }
          continue;
        }
        player.score = 0;
        player.correctCount = 0;
        player.raceProgress = 0;
        player.fireTurnsVisible = 0;
        player.stormActive = false;
        player.streak = 0;
        player.maxStreak = 0;
        player.totalResponseTimeMs = 0;
        player.completionTimeMs = undefined;
        player.forfeited = false;
        player.ready = player.isHost;
      }

      broadcastRoomState(room);
    });

    // 9. Disconnect
    socket.on("disconnect", () => {
      const { room } = roomManager.handleSocketDisconnect(socket.id, (r) => {
        if (!endMineSweeperIfSettled(r)) broadcastRoomState(r);
      });

      if (room) {
        broadcastRoomState(room);
      }
    });
  });
}
