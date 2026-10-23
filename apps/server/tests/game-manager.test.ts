import { describe, expect, it } from "vitest";
import { GameManager } from "../src/game/game-manager.js";
import { Player, RoomSettings, VocabularyItem } from "@bufobia/shared";

const settings: RoomSettings = {
  gameMode: "RACE",
  roundsCount: 10,
  roundDurationMs: 20000,
  raceDurationMs: 120000,
  revealIntervalMs: 3000,
  level: "ALL",
  category: "ALL",
};

const word: VocabularyItem = { id: "1", word: "race", meaning: "đua", level: "A1", category: "General" };
const player = (id: string, nickname: string, correctCount: number, score: number, totalResponseTimeMs = 0): Player => ({
  id, nickname, correctCount, score, socketId: id, ready: true, connected: true,
  raceProgress: correctCount, streak: 0, fireTurnsVisible: 0, stormActive: false, maxStreak: 0, totalResponseTimeMs, isHost: id === "p1",
});

describe("game-manager race mode", () => {
  it("ranks the furthest car first without a finish-line limit", () => {
    const game = new GameManager(Array.from({ length: 10 }, () => word), settings);
    const result = game.buildGameEndPayload([
      player("p1", "Fast score", 3, 9000),
      player("p2", "Winner", 5, 4000),
    ]);

    expect(result.winnerId).toBe("p2");
    expect(result.leaderboard[0].playerId).toBe("p2");
  });

  it("treats Cuộc đua kỳ thú as a race when building final results", () => {
    const game = new GameManager([word], { ...settings, gameMode: "AMAZING_RACE" });
    const result = game.buildGameEndPayload([player("p1", "Racer", 1, 1000)]);

    expect(game.isRaceMode()).toBe(true);
    expect(result.winnerId).toBe("p1");
  });

  it("ranks Mine Sweeper finishers by their completion time", () => {
    const game = new GameManager([word], { ...settings, gameMode: "MINE_SWEEPER" });
    const later = player("p1", "Later", 1, 1000);
    const earlier = player("p2", "Earlier", 1, 1000);
    later.completionTimeMs = 20000;
    earlier.completionTimeMs = 12000;

    expect(game.buildGameEndPayload([later, earlier]).leaderboard.map((entry) => entry.playerId)).toEqual(["p2", "p1"]);
  });

  it("waits for every Mine Sweeper participant to finish or forfeit", () => {
    const game = new GameManager([word], { ...settings, gameMode: "MINE_SWEEPER" });
    const first = player("p1", "First", 1, 1000);
    const second = player("p2", "Second", 0, 0);
    game.initializeRace([first.id, second.id]);

    first.completionTimeMs = 1000;
    expect(game.isMineSweeperSettled([first, second])).toBe(false);

    second.forfeited = true;
    expect(game.isMineSweeperSettled([first, second])).toBe(true);
  });

  it("keeps the complete Mine Sweeper set for review", () => {
    const words = ["apple", "beach"].map((word, index) => ({
      id: String(index), word, meaning: word, level: "A1" as const, category: "General",
    }));
    const game = new GameManager(words, { ...settings, gameMode: "MINE_SWEEPER", roundsCount: 2 });

    expect(game.buildGameEndPayload([player("p1", "One", 1, 0)]).reviewWords.map((item) => item.word)).toEqual(["apple", "beach"]);
  });

  it("reveals every letter in both race modes", () => {
    const newRaceWord = { ...word, word: "racing" };
    const game = new GameManager([newRaceWord], settings);
    game.initializeRace(["p1"]);
    const round = game.startRaceRound("p1", 0)!;

    while (round.revealNextHint()) undefined;

    expect(Object.keys(round.getPublicInfo().revealedPositions)).toHaveLength(newRaceWord.word.length);
  });

  it("gives concurrent racers the same ordered word list", () => {
    const words = ["apple", "beach", "cloud", "dance"].map((word, index) => ({
      id: String(index), word, meaning: word, level: "A1" as const, category: "General",
    }));
    const game = new GameManager(words, settings);
    game.initializeRace(["p1", "p2"]);

    const first = game.startRaceRound("p1", 0)!;
    const second = game.startRaceRound("p2", 0)!;
    const next = game.startRaceRound("p1", 1)!;

    expect(first.vocabulary.word).toBe(second.vocabulary.word);
    expect(next.vocabulary.word).not.toBe(second.vocabulary.word);
  });

  it("stops issuing words after a racer exhausts the fixed queue", () => {
    const game = new GameManager([word], settings);
    game.initializeRace(["p1"]);

    game.startRaceRound("p1", 0);
    const repeated = game.startRaceRound("p1", 1);

    expect(repeated).toBeNull();
  });

  it("moves faster racers farther for a correct answer", () => {
    const game = new GameManager([word], settings);
    const fast = player("p1", "Fast", 0, 0);
    const slow = player("p2", "Slow", 0, 0);

    game.recordRaceCorrectAnswer(fast, 1000, 1000, word.word, 20000);
    game.recordRaceCorrectAnswer(slow, 1000, 18000, word.word, 20000);

    expect(fast.raceProgress).toBeGreaterThan(slow.raceProgress);
  });

  it("turns a three-answer hot streak into a one-round storm after three fire turns", () => {
    const game = new GameManager([word], settings);
    const racer = player("p1", "Racer", 0, 0);

    for (let i = 0; i < 5; i += 1) {
      game.recordRaceCorrectAnswer(racer, 1000, 1000, word.word, 20000);
    }
    expect(racer).toMatchObject({ streak: 5, fireTurnsVisible: 3, stormActive: false });

    game.recordRaceCorrectAnswer(racer, 1000, 1000, word.word, 20000);
    expect(racer).toMatchObject({ streak: 6, fireTurnsVisible: 0, stormActive: true });

    game.resetPlayerStreak(racer);
    expect(racer).toMatchObject({ streak: 0, fireTurnsVisible: 0, stormActive: false });
  });

  it("records one shared review list as race words first appear", () => {
    const words = ["apple", "beach"].map((word, index) => ({
      id: String(index), word, meaning: word, level: "A1" as const, category: "General",
    }));
    const game = new GameManager(words, settings);
    game.initializeRace(["p1", "p2"]);
    game.startRaceRound("p1", 0);
    game.startRaceRound("p2", 0);
    game.startRaceRound("p1", 1);

    expect(game.buildGameEndPayload([player("p1", "One", 1, 0)]).reviewWords.map((item) => item.word)).toEqual(["apple", "beach"]);
  });

  it("breaks a race tie by score, then total answer time", () => {
    const game = new GameManager(Array.from({ length: 10 }, () => word), settings);
    const result = game.buildGameEndPayload([
      player("p1", "Quick", 3, 3000, 9000),
      player("p2", "Slow", 3, 3000, 12000),
    ]);

    expect(result.winnerId).toBe("p1");
    expect(result.leaderboard[0].playerId).toBe("p1");
  });
});
