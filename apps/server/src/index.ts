import http from "node:http";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { Server } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  VOCABULARY_CATEGORIES,
  VOCABULARY_LEVELS,
} from "@bufobia/shared";
import { RoomManager } from "./room/room-manager.js";
import { VocabularyService } from "./vocabulary/service.js";
import { setupSocketHandlers } from "./socket/handler.js";
import { UserStore } from "./auth/user-store.js";
import { auth, getSessionUser } from "./auth/auth.js";

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: process.env.AUTH_FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

// Better Auth must receive the raw request stream before express.json().
app.all("/api/auth/*", toNodeHandler(auth));
app.use(express.json());

const roomManager = new RoomManager();
const vocabularyService = new VocabularyService();
const userStore = new UserStore();

app.post("/api/feedback", async (req, res) => {
  const user = await getSessionUser(req.headers);
  if (!user) return res.status(401).json({ error: "Vui lòng đăng nhập để gửi góp ý." });
  const error = await userStore.createFeedback(user.id, req.body?.message ?? "");
  if (error) return res.status(400).json({ error });
  res.status(201).json({ success: true });
});

app.get("/api/dashboard", async (req, res) => {
  if (!await getSessionUser(req.headers)) {
    return res.status(401).json({ error: "Vui lòng đăng nhập để xem dashboard." });
  }
  res.json({ users: await userStore.count(), ...roomManager.getSystemStats(), vocabularyCount: vocabularyService.getAll().length });
});

app.get("/api/leaderboard", async (_req, res) => {
  res.json(await userStore.leaderboard());
});

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    vocabularyCount: vocabularyService.getAll().length,
  });
});

// Meta info
app.get("/api/meta", (_req, res) => {
  res.json({
    categories: VOCABULARY_CATEGORIES,
    levels: VOCABULARY_LEVELS,
    vocabularyCount: vocabularyService.getAll().length,
  });
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  path: process.env.VERCEL ? "/api/socket-io/socket.io" : "/socket.io",
  addTrailingSlash: false,
  cors: {
    origin: process.env.AUTH_FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST"],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

setupSocketHandlers(io, roomManager, vocabularyService, userStore, getSessionUser);

const PORT = process.env.PORT || 3001;
if (!process.env.VERCEL) {
  userStore.initialize().then(() => server.listen(PORT, () => {
    console.log(`[English Battle Server] running on http://localhost:${PORT}`);
  })).catch((error) => {
    console.error("[English Battle Server] database initialization failed", error);
    process.exit(1);
  });
}

export { app, server, io, roomManager, vocabularyService, userStore };
