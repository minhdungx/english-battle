"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomState,
  RoundPublicInfo,
  HintPayload,
  RoundEndPayload,
  GameEndPayload,
  PlayerAnswerSubmissionResult,
  RoomSettings,
  PlayerAnsweredNotification,
  PublicRoom,
  RaceAnswerRevealPayload,
  AdventureActionResult,
} from "@bufobia/shared";

export function useSocket() {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const reconnectRoomRef = useRef<{ roomCode: string; nickname: string } | null>(null);
  const roundIdRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [openRooms, setOpenRooms] = useState<PublicRoom[]>([]);
  const [roundInfo, setRoundInfo] = useState<RoundPublicInfo | null>(null);
  const [revealedPositions, setRevealedPositions] = useState<Record<number, string>>({});
  const [countdown, setCountdown] = useState<{ count: number; text?: string } | null>(null);
  const [roundEndData, setRoundEndData] = useState<RoundEndPayload | null>(null);
  const [gameEndData, setGameEndData] = useState<GameEndPayload | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [myAnswerResult, setMyAnswerResult] = useState<PlayerAnswerSubmissionResult | null>(null);
  const [recentAnswered, setRecentAnswered] = useState<PlayerAnsweredNotification[]>([]);
  const [extraPronunciation, setExtraPronunciation] = useState<string | null>(null);
  const [raceAnswerReveal, setRaceAnswerReveal] = useState<RaceAnswerRevealPayload | null>(null);
  const raceRevealTimerRef = useRef<number | null>(null);
  const raceReviewWordsRef = useRef<GameEndPayload["reviewWords"]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const configuredUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      configuredUrl || (process.env.NODE_ENV === "production" ? window.location.origin : "http://localhost:3001"),
      {
      path: configuredUrl || process.env.NODE_ENV !== "production" ? "/socket.io" : "/api/socket-io/socket.io",
      addTrailingSlash: false,
      withCredentials: true,
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      }
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("[Socket] Connected with ID:", socket.id);

      const room = reconnectRoomRef.current;
      if (room) {
        socket.emit("room:join", {
          roomCode: room.roomCode,
          nickname: room.nickname,
          playerToken: localStorage.getItem("player_token") || undefined,
        }, (res) => {
          if (res.success && res.playerId) setMyPlayerId(res.playerId);
        });
      }
      socket.emit("rooms:list", setOpenRooms);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("[Socket] Disconnected");
    });

    socket.on("room:state", (state: RoomState) => {
      setRoomState(state);
      if (state.round) {
        if (roundIdRef.current !== state.round.roundId) {
          roundIdRef.current = state.round.roundId;
          setMyAnswerResult(null);
        }
        setRoundInfo(state.round);
        setRevealedPositions(state.round.revealedPositions);
      }
      if (state.status === "LOBBY") {
        roundIdRef.current = null;
        setCountdown(null);
        setRoundEndData(null);
        setGameEndData(null);
        setMyAnswerResult(null);
        setRecentAnswered([]);
        setExtraPronunciation(null);
        setRaceAnswerReveal(null);
        raceReviewWordsRef.current = [];
      }
    });

    socket.on("rooms:update", setOpenRooms);

    socket.on("game:countdown", (data) => {
      setCountdown(data);
    });

    socket.on("round:start", (info: RoundPublicInfo) => {
      roundIdRef.current = info.roundId;
      setRoundInfo(info);
      setRevealedPositions(info.revealedPositions);
      setCountdown(null);
      setRoundEndData(null);
      setMyAnswerResult(null);
      setRecentAnswered([]);
      setExtraPronunciation(null);
      raceReviewWordsRef.current = [];
    });

    socket.on("round:hint", (hint: HintPayload) => {
      setRevealedPositions((prev) => ({
        ...prev,
        [hint.position]: hint.character,
      }));
    });

    socket.on("round:extra-hint", (hint) => {
      if (roundIdRef.current === hint.roundId) setExtraPronunciation(hint.pronunciation);
    });

    socket.on("race:answer-reveal", (payload) => {
      if (raceRevealTimerRef.current) window.clearTimeout(raceRevealTimerRef.current);
      setRaceAnswerReveal(payload);
      if (!raceReviewWordsRef.current.some((item) => item.word === payload.answer)) {
        raceReviewWordsRef.current = [
          ...raceReviewWordsRef.current,
          {
            id: payload.answer.toLowerCase(),
            word: payload.answer,
            meaning: payload.meaning,
            pronunciation: payload.pronunciation,
            partOfSpeech: "OTHER",
          },
        ];
      }
      raceRevealTimerRef.current = window.setTimeout(() => setRaceAnswerReveal(null), 2500);
    });

    socket.on("player:answered", (notification) => {
      setRecentAnswered((prev) => [notification, ...prev.slice(0, 4)]);
    });

    socket.on("round:end", (payload: RoundEndPayload) => {
      setRoundEndData(payload);
      setRevealedPositions(payload.revealedPositions);
    });

    socket.on("game:end", (payload: GameEndPayload) => {
      setGameEndData({
        ...payload,
        reviewWords: payload.reviewWords?.length ? payload.reviewWords : raceReviewWordsRef.current,
      });
    });

    socket.on("error:message", ({ message }) => {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    return () => {
      if (raceRevealTimerRef.current) window.clearTimeout(raceRevealTimerRef.current);
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback(
    (nickname: string, settings?: Partial<RoomSettings>): Promise<{ success: boolean; roomCode?: string; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) {
          return resolve({ success: false, error: "Chưa kết nối đến server" });
        }
        socketRef.current.emit("room:create", { nickname, settings }, (res) => {
          if (res.success && res.playerToken) {
            localStorage.setItem("player_token", res.playerToken);
            localStorage.setItem("player_nickname", nickname);
            if (res.roomCode) reconnectRoomRef.current = { roomCode: res.roomCode, nickname };
          }
          resolve(res);
        });
      });
    },
    []
  );

  const joinRoom = useCallback(
    (roomCode: string, nickname: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) {
          return resolve({ success: false, error: "Chưa kết nối đến server" });
        }
        const savedToken = typeof window !== "undefined" ? localStorage.getItem("player_token") || undefined : undefined;

        socketRef.current.emit("room:join", { roomCode, nickname, playerToken: savedToken }, (res) => {
          if (res.success) {
            if (res.playerToken) {
              localStorage.setItem("player_token", res.playerToken);
            }
            if (res.playerId) {
              setMyPlayerId(res.playerId);
            }
            localStorage.setItem("player_nickname", nickname);
            reconnectRoomRef.current = { roomCode, nickname };
          }
          resolve(res);
        });
      });
    },
    []
  );

  const leaveRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("room:leave");
      reconnectRoomRef.current = null;
      setMyPlayerId(null);
      setRoomState(null);
      setRoundInfo(null);
      setRoundEndData(null);
      setGameEndData(null);
      setMyAnswerResult(null);
      setExtraPronunciation(null);
      setRaceAnswerReveal(null);
      raceReviewWordsRef.current = [];
    }
  }, []);

  const toggleReady = useCallback((ready: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit("player:ready", { ready });
    }
  }, []);

  const startGame = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("game:start");
    }
  }, []);

  const updateSettings = useCallback((settings: Partial<RoomSettings>) => {
    if (socketRef.current) {
      socketRef.current.emit("room:update-settings", settings);
    }
  }, []);

  const submitAnswer = useCallback(
    (roundId: string, answer: string): Promise<PlayerAnswerSubmissionResult> => {
      return new Promise((resolve) => {
        if (!socketRef.current) {
          return resolve({ correct: false, score: 0, message: "Mất kết nối server" });
        }
        const socket = socketRef.current;
        let settled = false;
        const finish = (res: PlayerAnswerSubmissionResult) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          setMyAnswerResult(res);
          resolve(res);
        };
        const timeout = window.setTimeout(
          () => finish({ correct: false, score: 0, message: "Kết nối chậm, vui lòng thử lại." }),
          5000
        );
        socket.emit("answer:submit", { roundId, answer }, finish);
      });
    },
    []
  );

  const syncRoom = useCallback(() => {
    socketRef.current?.emit("room:sync");
  }, []);

  const skipRace = useCallback((roundId: string): Promise<AdventureActionResult> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, message: "Mất kết nối server" });
      socketRef.current.emit("race:skip", { roundId }, (result) => resolve(result));
    });
  }, []);

  const spinAdventure = useCallback((): Promise<AdventureActionResult> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, message: "Mất kết nối server" });
      socketRef.current.emit("adventure:spin", resolve);
    });
  }, []);

  const freezeAdventure = useCallback((targetPlayerId: string): Promise<AdventureActionResult> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, message: "Mất kết nối server" });
      socketRef.current.emit("adventure:freeze", { targetPlayerId }, resolve);
    });
  }, []);

  const playAgain = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("game:play-again");
    }
  }, []);

  return {
    isConnected,
    roomState,
    openRooms,
    roundInfo,
    revealedPositions,
    countdown,
    roundEndData,
    gameEndData,
    myPlayerId,
    myAnswerResult,
    recentAnswered,
    extraPronunciation,
    raceAnswerReveal,
    errorMessage,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startGame,
    updateSettings,
    submitAnswer,
    syncRoom,
    skipRace,
    spinAdventure,
    freezeAdventure,
    playAgain,
  };
}
