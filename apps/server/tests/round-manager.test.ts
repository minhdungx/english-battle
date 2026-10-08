import { describe, it, expect } from "vitest";
import { RoundManager } from "../src/game/round-manager.js";
import { VocabularyItem } from "@bufobia/shared";

describe("round-manager", () => {
  const sampleVocab: VocabularyItem = {
    id: "test_01",
    word: "achievement",
    meaning: "thành tựu",
    level: "B1",
    category: "General",
    acceptedAnswers: ["achievement", "achieve"],
  };

  it("normalizes user answers appropriately", () => {
    const round = new RoundManager({
      roundId: "r_1",
      roundNumber: 1,
      totalRounds: 5,
      vocabulary: sampleVocab,
      durationMs: 20000,
    });

    expect(round.normalizeAnswer("  Achievement  ")).toBe("achievement");
    expect(round.normalizeAnswer("ACHIEVEMENT")).toBe("achievement");
    expect(round.normalizeAnswer("  achieve   ment ")).toBe("achieve ment");
  });

  it("validates correct answer and accepted variants", () => {
    const round = new RoundManager({
      roundId: "r_1",
      roundNumber: 1,
      totalRounds: 5,
      vocabulary: sampleVocab,
      durationMs: 20000,
    });

    expect(round.isAnswerCorrect("achievement")).toBe(true);
    expect(round.isAnswerCorrect("ACHIEVEMENT")).toBe(true);
    expect(round.isAnswerCorrect("achieve")).toBe(true);
    expect(round.isAnswerCorrect("wronganswer")).toBe(false);
  });

  it("handles submission, calculates score, and prevents double scoring", () => {
    const now = 100000;
    const round = new RoundManager({
      roundId: "r_1",
      roundNumber: 1,
      totalRounds: 5,
      vocabulary: sampleVocab,
      durationMs: 20000,
      now,
    });

    // 1st correct submission
    const res1 = round.submitAnswer("p1", "achievement", now + 2000);
    expect(res1.isCorrect).toBe(true);
    expect(res1.score).toBeGreaterThan(0);
    expect(round.hasPlayerAnswered("p1")).toBe(true);

    // 2nd submission by same player
    const res2 = round.submitAnswer("p1", "achievement", now + 3000);
    expect(res2.alreadyAnswered).toBe(true);
    expect(res2.score).toBe(res1.score);
  });

  it("enforces submit cooldown to prevent brute force", () => {
    const now = 100000;
    const round = new RoundManager({
      roundId: "r_1",
      roundNumber: 1,
      totalRounds: 5,
      vocabulary: sampleVocab,
      durationMs: 20000,
      now,
    });

    // First wrong submit
    const res1 = round.submitAnswer("p1", "wrong1", now);
    expect(res1.isCorrect).toBe(false);
    expect(res1.cooldown).toBeFalsy();

    // Second wrong submit after 100ms (< 300ms)
    const res2 = round.submitAnswer("p1", "wrong2", now + 100);
    expect(res2.cooldown).toBe(true);

    // Third submit after 400ms (> 300ms from previous)
    const res3 = round.submitAnswer("p1", "achievement", now + 550);
    expect(res3.cooldown).toBeFalsy();
    expect(res3.isCorrect).toBe(true);
  });

  it("rejects submissions after round expires", () => {
    const now = 100000;
    const round = new RoundManager({
      roundId: "r_1",
      roundNumber: 1,
      totalRounds: 5,
      vocabulary: sampleVocab,
      durationMs: 20000,
      now,
    });

    const res = round.submitAnswer("p1", "achievement", now + 25000);
    expect(res.success).toBe(false);
    expect(res.isCorrect).toBe(false);
  });
});
