import { describe, it, expect } from "vitest";
import { calculateScore } from "../src/game/score-engine.js";

describe("score-engine", () => {
  const roundDurationMs = 20000;
  const startedAt = 100000;
  const endsAt = startedAt + roundDurationMs;

  it("awards higher score to earlier submissions with same hints", () => {
    const early = calculateScore({
      startedAt,
      endsAt,
      submittedAt: startedAt + 2000, // 2s
      roundDurationMs,
      revealedCount: 2,
      guessableLength: 10,
    });

    const late = calculateScore({
      startedAt,
      endsAt,
      submittedAt: startedAt + 15000, // 15s
      roundDurationMs,
      revealedCount: 2,
      guessableLength: 10,
    });

    expect(early.score).toBeGreaterThan(late.score);
  });

  it("awards higher score to players who guess with fewer revealed hints", () => {
    const fewHints = calculateScore({
      startedAt,
      endsAt,
      submittedAt: startedAt + 5000,
      roundDurationMs,
      revealedCount: 1,
      guessableLength: 10,
    });

    const manyHints = calculateScore({
      startedAt,
      endsAt,
      submittedAt: startedAt + 5000,
      roundDurationMs,
      revealedCount: 7,
      guessableLength: 10,
    });

    expect(fewHints.score).toBeGreaterThan(manyHints.score);
  });

  it("never returns score less than 0 or greater than baseScore", () => {
    // Extreme early (0ms, 0 hints)
    const maxScore = calculateScore({
      startedAt,
      endsAt,
      submittedAt: startedAt,
      roundDurationMs,
      revealedCount: 0,
      guessableLength: 10,
    });
    expect(maxScore.score).toBeLessThanOrEqual(1000);
    expect(maxScore.score).toBe(1000);

    // Extreme late (timeout, all hints)
    const minScore = calculateScore({
      startedAt,
      endsAt,
      submittedAt: endsAt,
      roundDurationMs,
      revealedCount: 10,
      guessableLength: 10,
    });
    expect(minScore.score).toBeGreaterThanOrEqual(0);
    // baseScore * 0.6 * 0.5 = 300
    expect(minScore.score).toBe(300);
  });
});
