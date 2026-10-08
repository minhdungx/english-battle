import {
  GameMode,
  GameEndPayload,
  GameStatistics,
  Player,
  PlayerLeaderboardEntry,
  RoomSettings,
  VocabularyItem,
} from "@bufobia/shared";
import { RoundManager } from "./round-manager.js";

export class GameManager {
  public readonly totalRounds: number;
  public readonly words: VocabularyItem[];
  public currentRoundIndex: number = 0;
  public currentRound: RoundManager | null = null;
  public roundIntervalTimer: NodeJS.Timeout | null = null;
  public hintIntervalTimer: NodeJS.Timeout | null = null;
  public readonly gameMode: GameMode;
  public raceEndsAt?: number;
  public raceTimer: NodeJS.Timeout | null = null;
  public readonly raceRounds = new Map<string, RoundManager>();
  public readonly raceRoundTimers = new Map<string, NodeJS.Timeout>();
  public readonly raceHintTimers = new Map<string, NodeJS.Timeout>();
  public readonly raceExtraHintTimers = new Map<string, NodeJS.Timeout>();
  public readonly adventureSpinTimers = new Map<string, NodeJS.Timeout>();
  private readonly raceWordQueues = new Map<string, VocabularyItem[]>();
  private readonly raceWordHistory: VocabularyItem[] = [];
  private readonly raceComebackCooldowns = new Map<string, number>();

  private fastestAnswerRecord?: {
    playerId: string;
    nickname: string;
    word: string;
    responseTimeMs: number;
  };
  private readonly roundDurationMs: number;

  constructor(words: VocabularyItem[], settings: RoomSettings) {
    this.words = words;
    this.gameMode = settings.gameMode;
    this.roundDurationMs = settings.roundDurationMs;
    this.totalRounds = Math.min(settings.roundsCount, words.length);
  }

  public startRound(roundNumber: number, durationMs?: number): RoundManager {
    this.clearTimers();
    this.currentRoundIndex = roundNumber;
    const wordItem = this.words[roundNumber - 1];

    this.currentRound = new RoundManager({
      roundId: `round_${roundNumber}_${Date.now()}`,
      roundNumber,
      totalRounds: this.totalRounds,
      vocabulary: wordItem,
      durationMs,
    });

    return this.currentRound;
  }

  public recordCorrectAnswer(
    player: Player,
    score: number,
    responseTimeMs: number,
    word: string
  ): void {
    player.score += score;
    player.correctCount += 1;
    player.streak += 1;
    if (player.streak < 3) {
      player.fireTurnsVisible = 0;
      player.stormActive = false;
    } else if (player.fireTurnsVisible >= 3) {
      player.fireTurnsVisible = 0;
      player.stormActive = true;
    } else {
      player.fireTurnsVisible += 1;
      player.stormActive = false;
    }
    if (player.streak > player.maxStreak) {
      player.maxStreak = player.streak;
    }
    player.totalResponseTimeMs += responseTimeMs;

    if (
      !this.fastestAnswerRecord ||
      responseTimeMs < this.fastestAnswerRecord.responseTimeMs
    ) {
      this.fastestAnswerRecord = {
        playerId: player.id,
        nickname: player.nickname,
        word,
        responseTimeMs,
      };
    }
  }

  public recordRaceCorrectAnswer(
    player: Player,
    players: Player[],
    score: number,
    responseTimeMs: number,
    word: string,
    roundDurationMs: number
  ): { distance: number; comebackBonus: number } {
    const ranking = [...players].sort((a, b) => b.raceProgress - a.raceProgress || b.score - a.score);
    const rank = ranking.findIndex((racer) => racer.id === player.id);
    const racerAhead = rank > 0 ? ranking[rank - 1] : undefined;
    const gap = racerAhead ? racerAhead.raceProgress - player.raceProgress : 0;
    const canComeback = gap >= 1 && player.correctCount >= (this.raceComebackCooldowns.get(player.id) ?? 0);
    this.recordCorrectAnswer(player, score, responseTimeMs, word);
    const remainingRatio = Math.max(0, Math.min(1, 1 - responseTimeMs / roundDurationMs));
    const distance = 0.35 + 0.65 * remainingRatio;
    const comebackBonus = canComeback ? distance * 0.2 : 0;
    player.raceProgress += distance + comebackBonus;
    if (canComeback) this.raceComebackCooldowns.set(player.id, player.correctCount + 2);
    return { distance, comebackBonus };
  }

  public isRaceMode(): boolean {
    return this.gameMode === "RACE" || this.gameMode === "AMAZING_RACE";
  }

  public isAmazingRace(): boolean {
    return this.gameMode === "AMAZING_RACE";
  }

  public finalizeRoundStreaks(players: Player[]): void {
    if (!this.currentRound) return;
    for (const player of players) {
      if (!this.currentRound.hasPlayerAnswered(player.id)) {
        this.resetPlayerStreak(player);
      }
    }
  }

  public resetPlayerStreak(player: Player): void {
    player.streak = 0;
    player.fireTurnsVisible = 0;
    player.stormActive = false;
  }

  public isLastRound(): boolean {
    return this.currentRoundIndex >= this.totalRounds;
  }

  public initializeRace(playerIds: string[], endsAt: number): void {
    this.raceEndsAt = endsAt;
    this.raceRounds.clear();
    this.raceWordQueues.clear();
    this.raceWordHistory.length = 0;
    this.raceComebackCooldowns.clear();

    for (const playerId of playerIds) this.raceWordQueues.set(playerId, [...this.words]);
  }

  public startRaceRound(playerId: string, progress: number): RoundManager | null {
    const remainingMs = (this.raceEndsAt ?? 0) - Date.now();
    if (remainingMs <= 0) return null;

    const previousRound = this.raceRounds.get(playerId);
    this.raceRounds.delete(playerId);
    const word = this.takeRaceWord(playerId);
    if (!word) {
      if (previousRound) this.raceRounds.set(playerId, previousRound);
      return null;
    }

    if (!this.raceWordHistory.some((item) => item.id === word.id)) this.raceWordHistory.push(word);

    this.clearRacePlayerTimers(playerId);
    const round = new RoundManager({
      roundId: `race_${playerId}_${Date.now()}`,
      roundNumber: progress + 1,
      totalRounds: 0,
      vocabulary: word,
      durationMs: Math.min(remainingMs, this.roundDurationMs),
    });
    this.raceRounds.set(playerId, round);
    return round;
  }

  public getRaceRound(playerId: string): RoundManager | undefined {
    return this.raceRounds.get(playerId);
  }

  public clearRacePlayerTimers(playerId: string): void {
    const roundTimer = this.raceRoundTimers.get(playerId);
    if (roundTimer) clearTimeout(roundTimer);
    this.raceRoundTimers.delete(playerId);

    const hintTimer = this.raceHintTimers.get(playerId);
    if (hintTimer) clearInterval(hintTimer);
    this.raceHintTimers.delete(playerId);

    const extraHintTimer = this.raceExtraHintTimers.get(playerId);
    if (extraHintTimer) clearTimeout(extraHintTimer);
    this.raceExtraHintTimers.delete(playerId);
  }

  private takeRaceWord(playerId: string): VocabularyItem | undefined {
    const queue = this.raceWordQueues.get(playerId) ?? [];
    this.raceWordQueues.set(playerId, queue);
    if (queue.length === 0) queue.push(...this.words);
    return queue.shift();
  }

  public clearTimers(): void {
    if (this.roundIntervalTimer) {
      clearTimeout(this.roundIntervalTimer);
      this.roundIntervalTimer = null;
    }
    if (this.hintIntervalTimer) {
      clearInterval(this.hintIntervalTimer);
      this.hintIntervalTimer = null;
    }
    if (this.raceTimer) {
      clearTimeout(this.raceTimer);
      this.raceTimer = null;
    }
    for (const playerId of this.raceRounds.keys()) this.clearRacePlayerTimers(playerId);
    for (const timer of this.adventureSpinTimers.values()) clearInterval(timer);
    this.adventureSpinTimers.clear();
  }

  public buildGameEndPayload(players: Player[]): GameEndPayload {
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
        boostMultiplier: p.boostMultiplier,
        boostEndsAt: p.boostEndsAt,
        frozenUntil: p.frozenUntil,
        adventureSpinReady: p.adventureSpinReady,
        adventurePendingFreeze: p.adventurePendingFreeze,
        totalResponseTimeMs: p.totalResponseTimeMs,
      }))
      .sort((a, b) =>
        this.isRaceMode()
          ? b.raceProgress - a.raceProgress || b.score - a.score || a.totalResponseTimeMs - b.totalResponseTimeMs
          : b.score - a.score
      )
      .map(({ totalResponseTimeMs: _totalResponseTimeMs, ...player }) => player);

    const podium = leaderboard.slice(0, 3);

    // Calculate game statistics
    let mostCorrectPlayer: Player | undefined;
    let longestStreakPlayer: Player | undefined;
    let highestScorePlayer: Player | undefined;

    for (const p of players) {
      if (!mostCorrectPlayer || p.correctCount > mostCorrectPlayer.correctCount) {
        mostCorrectPlayer = p;
      }
      if (!longestStreakPlayer || p.maxStreak > longestStreakPlayer.maxStreak) {
        longestStreakPlayer = p;
      }
      if (!highestScorePlayer || p.score > highestScorePlayer.score) {
        highestScorePlayer = p;
      }
    }

    const statistics: GameStatistics = {
      fastestAnswer: this.fastestAnswerRecord,
      mostCorrect: mostCorrectPlayer
        ? {
            playerId: mostCorrectPlayer.id,
            nickname: mostCorrectPlayer.nickname,
            count: mostCorrectPlayer.correctCount,
          }
        : undefined,
      longestStreak: longestStreakPlayer
        ? {
            playerId: longestStreakPlayer.id,
            nickname: longestStreakPlayer.nickname,
            streak: longestStreakPlayer.maxStreak,
          }
        : undefined,
      highestScore: highestScorePlayer
        ? {
            playerId: highestScorePlayer.id,
            nickname: highestScorePlayer.nickname,
            score: highestScorePlayer.score,
          }
        : undefined,
    };

    return {
      totalRounds: this.totalRounds,
      leaderboard,
      podium,
      statistics,
      gameMode: this.gameMode,
      winnerId: this.isRaceMode() ? leaderboard[0]?.playerId : undefined,
      reviewWords: (this.isRaceMode() ? this.raceWordHistory : this.words.slice(0, this.totalRounds)).map((word) => ({
        id: word.id,
        word: word.word,
        meaning: word.meaning,
        pronunciation: word.pronunciation,
        partOfSpeech: word.partOfSpeech ?? "OTHER",
      })),
    };
  }
}
