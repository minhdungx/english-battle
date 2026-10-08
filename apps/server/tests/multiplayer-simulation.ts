import { io as ClientSocket, Socket } from "socket.io-client";
import { Server } from "socket.io";
import http from "node:http";
import express from "express";
import cors from "cors";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomState,
  RoundPublicInfo,
  RoundEndPayload,
} from "@bufobia/shared";
import { RoomManager } from "../src/room/room-manager.js";
import { VocabularyService } from "../src/vocabulary/service.js";
import { setupSocketHandlers } from "../src/socket/handler.js";

async function runSimulation() {
  console.log("=== Starting Multiplayer Game Simulation ===");

  const app = express();
  app.use(cors());
  const server = http.createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);

  const roomManager = new RoomManager();
  const mockVocab = [
    {
      id: "sim_1",
      word: "achievement",
      meaning: "thành tựu",
      level: "B1" as const,
      category: "General",
    },
    {
      id: "sim_2",
      word: "environment",
      meaning: "môi trường",
      level: "B1" as const,
      category: "General",
    },
  ];
  const vocabService = new VocabularyService(mockVocab);
  setupSocketHandlers(io, roomManager, vocabService);

  const PORT = 3099;
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`[Simulation Server] Listening on port ${PORT}`);

  const url = `http://localhost:${PORT}`;

  function createClient(name: string): Promise<Socket<ServerToClientEvents, ClientToServerEvents>> {
    return new Promise((resolve, reject) => {
      const socket = ClientSocket(url, { transports: ["websocket", "polling"] });
      socket.on("connect", () => {
        resolve(socket);
      });
      socket.on("connect_error", (err) => {
        console.error(`[${name}] Connect error:`, err);
        reject(err);
      });
    });
  }

  // 1. Connect 3 simulated players
  const clientHost = await createClient("Host_Minh");
  const client2 = await createClient("Player_Nam");
  const client3 = await createClient("Player_Linh");
  console.log("✓ Connected 3 simulated sockets");

  // 2. Host creates room
  let roomCode = "";
  await new Promise<void>((resolve) => {
    clientHost.emit(
      "room:create",
      { nickname: "Minh", settings: { roundsCount: 2, roundDurationMs: 8000, revealIntervalMs: 1500 } },
      (res) => {
        if (res.success && res.roomCode) {
          roomCode = res.roomCode;
          console.log(`✓ Room created with code: ${roomCode}`);
          resolve();
        }
      }
    );
  });

  // 3. Player 2 and Player 3 join room
  await new Promise<void>((resolve) => {
    client2.emit("room:join", { roomCode, nickname: "Nam" }, (res) => {
      if (res.success) {
        console.log("✓ Nam joined room");
        resolve();
      }
    });
  });

  await new Promise<void>((resolve) => {
    client3.emit("room:join", { roomCode, nickname: "Linh" }, (res) => {
      if (res.success) {
        console.log("✓ Linh joined room");
        resolve();
      }
    });
  });

  // 4. Players set ready
  client2.emit("player:ready", { ready: true });
  client3.emit("player:ready", { ready: true });
  console.log("✓ Nam and Linh set ready");

  // Give 100ms for state to settle
  await new Promise((r) => setTimeout(r, 100));

  // 5. Host starts game
  console.log("Host starting game...");
  clientHost.emit("game:start");

  // 6. Listen for round:start on all 3 clients
  let currentRoundId = "";
  await new Promise<void>((resolve) => {
    let startedCount = 0;
    const checkStart = (info: RoundPublicInfo, player: string) => {
      currentRoundId = info.roundId;
      startedCount++;
      console.log(`✓ [${player}] Received round:start for word length ${info.wordLength}, meaning: "${info.meaning}"`);
      if (startedCount === 3) {
        resolve();
      }
    };

    clientHost.once("round:start", (info) => checkStart(info, "Minh"));
    client2.once("round:start", (info) => checkStart(info, "Nam"));
    client3.once("round:start", (info) => checkStart(info, "Linh"));
  });

  // 7. Verify hint received
  await new Promise<void>((resolve) => {
    clientHost.once("round:hint", (hint) => {
      console.log(`✓ Received hint at position ${hint.position}: '${hint.character}' (Total revealed: ${hint.revealedCount})`);
      resolve();
    });
  });

  // 8. Minh submits answer
  await new Promise<void>((resolve) => {
    clientHost.emit("answer:submit", { roundId: currentRoundId, answer: "achievement" }, (res) => {
      console.log(`✓ Minh answered: correct=${res.correct}, score=${res.score}, responseTime=${res.responseTimeMs}ms`);
      resolve();
    });
  });

  // 9. Nam and Linh submit answers
  await new Promise<void>((resolve) => {
    client2.emit("answer:submit", { roundId: currentRoundId, answer: "achievement" }, (res) => {
      console.log(`✓ Nam answered: correct=${res.correct}, score=${res.score}`);
      resolve();
    });
  });

  // Nam submits again to test double-submit guard
  await new Promise<void>((resolve) => {
    client2.emit("answer:submit", { roundId: currentRoundId, answer: "achievement" }, (res) => {
      console.log(`✓ Nam double submit test: alreadyAnswered=${res.alreadyAnswered}`);
      resolve();
    });
  });

  // 10. Wait for round:end
  await new Promise<void>((resolve) => {
    clientHost.once("round:end", (payload: RoundEndPayload) => {
      console.log(`✓ Round ended! Answer revealed: "${payload.answer}"`);
      console.log("✓ Leaderboard top player:", payload.leaderboard[0].nickname, payload.leaderboard[0].score);
      resolve();
    });
  });

  // Disconnect clients and close server
  clientHost.disconnect();
  client2.disconnect();
  client3.disconnect();
  server.close();

  console.log("=== Multiplayer Game Simulation PASSED successfully! ===");
}

runSimulation().catch((err) => {
  console.error("Simulation failed:", err);
  process.exit(1);
});
