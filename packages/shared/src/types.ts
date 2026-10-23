import { VocabularyLevel, VocabularyCategory } from "./constants.js";

export type GameStatus =
  | "LOBBY"
  | "COUNTDOWN"
  | "PLAYING"
  | "ROUND_RESULT"
  | "GAME_RESULT";

export type GameMode = "CLASSIC" | "RACE" | "AMAZING_RACE" | "MINE_SWEEPER";
export type PartOfSpeech = "NOUN" | "VERB" | "ADJECTIVE" | "ADVERB" | "PHRASE" | "OTHER";

export interface RoomSettings {
  gameMode: GameMode;
  roundsCount: number;
  roundDurationMs: number;
  raceDurationMs: number;
  revealIntervalMs: number;
  level: VocabularyLevel;
  category: VocabularyCategory;
}

export interface Player {
  id: string;
  userId?: string;
  socketId: string;
  nickname: string;
  score: number;
  ready: boolean;
  connected: boolean;
  correctCount: number;
  raceProgress: number;
  streak: number;
  fireTurnsVisible: number;
  stormActive: boolean;
  maxStreak: number;
  totalResponseTimeMs: number;
  completionTimeMs?: number;
  forfeited?: boolean;
  isHost: boolean;
}

export interface VocabularyItem {
  id: string;
  word: string;
  meaning: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  category: string;
  acceptedAnswers?: string[];
  pronunciation?: string;
  partOfSpeech?: PartOfSpeech;
  example?: string;
}

export interface RoundPublicInfo {
  roundId: string;
  round: number;
  totalRounds: number;
  meaning: string;
  wordLength: number;
  revealedPositions: Record<number, string>;
  startedAt: number;
  endsAt: number;
  durationMs: number;
  level?: string;
  category?: string;
  partOfSpeech: PartOfSpeech;
}

export interface RoundExtraHintPayload {
  roundId: string;
  pronunciation: string;
}

export interface RaceAnswerRevealPayload {
  roundId: string;
  answer: string;
  meaning: string;
  pronunciation?: string;
}

export interface HintPayload {
  roundId: string;
  position: number;
  character: string;
  revealedCount: number;
}

export interface PlayerAnswerSubmissionResult {
  correct: boolean;
  score: number;
  responseTimeMs?: number;
  alreadyAnswered?: boolean;
  cooldown?: boolean;
  message?: string;
}

export interface PlayerAnsweredNotification {
  playerId: string;
  nickname: string;
  isCorrect: boolean;
  responseTimeMs?: number;
  raceProgressDelta?: number;
  comebackBonus?: number;
}

export interface RoundPlayerResult {
  playerId: string;
  nickname: string;
  isCorrect: boolean;
  responseTimeMs?: number;
  scoreEarned: number;
  totalScore: number;
  streak: number;
}

export interface PlayerLeaderboardEntry {
  playerId: string;
  nickname: string;
  score: number;
  correctCount: number;
  raceProgress: number;
  streak: number;
  fireTurnsVisible: number;
  stormActive: boolean;
  connected: boolean;
  isHost: boolean;
  completionTimeMs?: number;
  forfeited?: boolean;
}

export interface RoundEndPayload {
  roundId: string;
  round: number;
  totalRounds: number;
  answer: string;
  meaning: string;
  pronunciation?: string;
  example?: string;
  revealedPositions: Record<number, string>;
  results: RoundPlayerResult[];
  leaderboard: PlayerLeaderboardEntry[];
  nextRoundInMs: number;
}

export interface GameStatistics {
  fastestAnswer?: {
    playerId: string;
    nickname: string;
    word: string;
    responseTimeMs: number;
  };
  mostCorrect?: {
    playerId: string;
    nickname: string;
    count: number;
  };
  longestStreak?: {
    playerId: string;
    nickname: string;
    streak: number;
  };
  highestScore?: {
    playerId: string;
    nickname: string;
    score: number;
  };
}

export interface GameEndPayload {
  totalRounds: number;
  leaderboard: PlayerLeaderboardEntry[];
  podium: PlayerLeaderboardEntry[];
  statistics: GameStatistics;
  gameMode: GameMode;
  winnerId?: string;
  reviewWords: Array<Pick<VocabularyItem, "id" | "word" | "meaning" | "pronunciation" | "partOfSpeech">>;
}

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  status: GameStatus;
  currentRound: number;
  totalRounds: number;
  settings: RoomSettings;
  round?: RoundPublicInfo;
  raceEndsAt?: number;
  gameStartedAt?: number;
}

export interface PublicRoom {
  code: string;
  hostNickname: string;
  playerCount: number;
  status: GameStatus;
  settings: RoomSettings;
  currentRound: number;
  totalRounds: number;
}

// Client to Server events
export interface ClientToServerEvents {
  "room:create": (
    data: { nickname: string; settings?: Partial<RoomSettings>; authToken?: string },
    callback?: (response: { success: boolean; roomCode?: string; playerToken?: string; error?: string }) => void
  ) => void;
  "room:join": (
    data: { roomCode: string; nickname: string; playerToken?: string; authToken?: string },
    callback?: (response: { success: boolean; roomCode?: string; playerToken?: string; playerId?: string; error?: string }) => void
  ) => void;
  "room:leave": () => void;
  "room:update-settings": (settings: Partial<RoomSettings>) => void;
  "player:ready": (data: { ready: boolean }) => void;
  "game:start": () => void;
  "room:sync": () => void;
  "rooms:list": (callback?: (rooms: PublicRoom[]) => void) => void;
  "answer:submit": (
    data: { roundId: string; answer: string },
    callback?: (result: PlayerAnswerSubmissionResult) => void
  ) => void;
  "game:play-again": () => void;
}

// Server to Client events
export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "rooms:update": (rooms: PublicRoom[]) => void;
  "game:countdown": (data: { count: number; text?: string }) => void;
  "round:start": (info: RoundPublicInfo) => void;
  "round:hint": (hint: HintPayload) => void;
  "round:extra-hint": (hint: RoundExtraHintPayload) => void;
  "race:answer-reveal": (payload: RaceAnswerRevealPayload) => void;
  "player:answered": (notification: PlayerAnsweredNotification) => void;
  "round:end": (payload: RoundEndPayload) => void;
  "game:end": (payload: GameEndPayload) => void;
  "error:message": (data: { message: string }) => void;
}
