import {
  GAME_CONSTANTS,
  RoundPublicInfo,
  RoundEndPayload,
  RoundPlayerResult,
  PlayerLeaderboardEntry,
  Player,
  VocabularyItem,
} from "@bufobia/shared";
import {
  generateRevealOrder,
  calculateInitialRevealedPositions,
  getNextReveal,
  getGuessablePositions,
} from "./reveal-manager.js";
import { calculateScore } from "./score-engine.js";

export interface PlayerSubmissionRecord {
  playerId: string;
  isCorrect: boolean;
  score: number;
  responseTimeMs: number;
  submittedAt: number;
}

export class RoundManager {
  public readonly roundId: string;
  public readonly roundNumber: number;
  public readonly totalRounds: number;
  public readonly vocabulary: VocabularyItem;
  public readonly startedAt: number;
  public readonly endsAt: number;
  public readonly durationMs: number;

  private revealOrder: number[];
  private revealedPositions: Record<number, string>;
  private revealedGuessableIndices: Set<number>;
  private readonly revealAllHints: boolean;
  private playerAnswers: Map<string, PlayerSubmissionRecord> = new Map();
  private lastSubmissionTimes: Map<string, number> = new Map();

  constructor(params: {
    roundId: string;
    roundNumber: number;
    totalRounds: number;
    vocabulary: VocabularyItem;
    durationMs?: number;
    now?: number;
    revealAllHints?: boolean;
  }) {
    this.roundId = params.roundId;
    this.roundNumber = params.roundNumber;
    this.totalRounds = params.totalRounds;
    this.vocabulary = params.vocabulary;
    this.durationMs = params.durationMs ?? GAME_CONSTANTS.DEFAULT_ROUND_DURATION_MS;

    const currentTime = params.now ?? Date.now();
    this.startedAt = currentTime;
    this.endsAt = currentTime + this.durationMs;
    this.revealAllHints = params.revealAllHints ?? false;

    this.revealOrder = generateRevealOrder(this.vocabulary.word);
    const initial = calculateInitialRevealedPositions(this.vocabulary.word, this.revealOrder, this.revealAllHints);
    this.revealedPositions = initial.revealedPositions;
    this.revealedGuessableIndices = initial.revealedGuessableIndices;
  }

  public normalizeAnswer(raw: string): string {
    return raw
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  public isAnswerCorrect(raw: string): boolean {
    const normalized = this.normalizeAnswer(raw);
    const targetWord = this.normalizeAnswer(this.vocabulary.word);

    if (normalized === targetWord) {
      return true;
    }

    if (this.vocabulary.acceptedAnswers && this.vocabulary.acceptedAnswers.length > 0) {
      return this.vocabulary.acceptedAnswers.some(
        (acc) => this.normalizeAnswer(acc) === normalized
      );
    }

    return false;
  }

  public submitAnswer(
    playerId: string,
    rawAnswer: string,
    now: number = Date.now()
  ): {
    success: boolean;
    isCorrect: boolean;
    score: number;
    responseTimeMs?: number;
    alreadyAnswered?: boolean;
    cooldown?: boolean;
    message?: string;
  } {
    // 1. Check if round is already expired
    if (this.durationMs > 0 && now > this.endsAt) {
      return {
        success: false,
        isCorrect: false,
        score: 0,
        message: "Round has already ended",
      };
    }

    // 2. Check if player has already submitted correct answer
    const existing = this.playerAnswers.get(playerId);
    if (existing && existing.isCorrect) {
      return {
        success: true,
        isCorrect: true,
        score: existing.score,
        responseTimeMs: existing.responseTimeMs,
        alreadyAnswered: true,
        message: "You have already answered correctly in this round",
      };
    }

    // 3. Rate limiting / Cooldown check (300ms)
    const lastSubmit = this.lastSubmissionTimes.get(playerId);
    if (lastSubmit && now - lastSubmit < GAME_CONSTANTS.SUBMIT_COOLDOWN_MS) {
      return {
        success: false,
        isCorrect: false,
        score: 0,
        cooldown: true,
        message: "Submitting too fast. Please wait a moment.",
      };
    }
    this.lastSubmissionTimes.set(playerId, now);

    // 4. Validate answer
    const isCorrect = this.isAnswerCorrect(rawAnswer);
    if (!isCorrect) {
      return {
        success: true,
        isCorrect: false,
        score: 0,
      };
    }

    // 5. Calculate authoritative score
    const guessableCount = getGuessablePositions(this.vocabulary.word).length;
    const scoreResult = calculateScore({
      startedAt: this.startedAt,
      endsAt: this.endsAt,
      submittedAt: now,
      roundDurationMs: this.durationMs,
      revealedCount: this.revealedGuessableIndices.size,
      guessableLength: guessableCount,
    });

    const record: PlayerSubmissionRecord = {
      playerId,
      isCorrect: true,
      score: scoreResult.score,
      responseTimeMs: scoreResult.responseTimeMs,
      submittedAt: now,
    };
    this.playerAnswers.set(playerId, record);

    return {
      success: true,
      isCorrect: true,
      score: scoreResult.score,
      responseTimeMs: scoreResult.responseTimeMs,
    };
  }

  public revealNextHint(): {
    position: number;
    character: string;
    revealedCount: number;
  } | null {
    const next = getNextReveal(
      this.vocabulary.word,
      this.revealOrder,
      this.revealedGuessableIndices,
      undefined,
      this.revealAllHints
    );

    if (!next) {
      return null;
    }

    this.revealedPositions[next.position] = next.character;

    return {
      position: next.position,
      character: next.character,
      revealedCount: this.revealedGuessableIndices.size,
    };
  }

  public getPublicInfo(): RoundPublicInfo {
    return {
      roundId: this.roundId,
      round: this.roundNumber,
      totalRounds: this.totalRounds,
      meaning: this.vocabulary.meaning,
      wordLength: this.vocabulary.word.length,
      revealedPositions: { ...this.revealedPositions },
      startedAt: this.startedAt,
      endsAt: this.endsAt,
      durationMs: this.durationMs,
      level: this.vocabulary.level,
      category: this.vocabulary.category,
      partOfSpeech: this.vocabulary.partOfSpeech ?? "OTHER",
    };
  }

  public hasPlayerAnswered(playerId: string): boolean {
    return this.playerAnswers.get(playerId)?.isCorrect ?? false;
  }

  public areAllPlayersCorrect(activePlayerIds: string[]): boolean {
    if (activePlayerIds.length === 0) return false;
    return activePlayerIds.every((id) => this.hasPlayerAnswered(id));
  }

  public isExpired(now: number = Date.now()): boolean {
    return now >= this.endsAt;
  }

  public buildEndPayload(
    players: Player[],
    nextRoundInMs: number = GAME_CONSTANTS.ROUND_RESULT_DURATION_MS
  ): RoundEndPayload {
    // Full reveal map for the answer
    const fullReveal: Record<number, string> = {};
    for (let i = 0; i < this.vocabulary.word.length; i++) {
      fullReveal[i] = this.vocabulary.word[i].toUpperCase();
    }

    const results: RoundPlayerResult[] = players.map((p) => {
      const submission = this.playerAnswers.get(p.id);
      const isCorrect = submission?.isCorrect ?? false;
      const scoreEarned = submission?.score ?? 0;
      return {
        playerId: p.id,
        nickname: p.nickname,
        isCorrect,
        responseTimeMs: submission?.responseTimeMs,
        scoreEarned,
        totalScore: p.score,
        streak: p.streak,
      };
    });

    // Sort results by scoreEarned descending, then responseTime ascending
    results.sort((a, b) => {
      if (b.scoreEarned !== a.scoreEarned) return b.scoreEarned - a.scoreEarned;
      return (a.responseTimeMs ?? Infinity) - (b.responseTimeMs ?? Infinity);
    });

    const leaderboard: PlayerLeaderboardEntry[] = players
      .map((p) => ({
        playerId: p.id,
        nickname: p.nickname,
        score: p.score,
        correctCount: p.correctCount,
        raceProgress: p.raceProgress,
        streak: p.streak,
        fireTurnsVisible: p.fireTurnsVisible,
        stormActive: p.stormActive,
        connected: p.connected,
        isHost: p.isHost,
      }))
      .sort((a, b) => b.score - a.score);

    return {
      roundId: this.roundId,
      round: this.roundNumber,
      totalRounds: this.totalRounds,
      answer: this.vocabulary.word.toUpperCase(),
      meaning: this.vocabulary.meaning,
      pronunciation: this.vocabulary.pronunciation,
      example: this.vocabulary.example,
      revealedPositions: fullReveal,
      results,
      leaderboard,
      nextRoundInMs,
    };
  }
}
