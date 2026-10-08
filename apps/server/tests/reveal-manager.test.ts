import { describe, it, expect } from "vitest";
import {
  getGuessablePositions,
  getInitialRevealCount,
  generateRevealOrder,
  calculateInitialRevealedPositions,
  getNextReveal,
  getMaxRevealedCount,
  buildMaskedWord,
} from "../src/game/reveal-manager.js";

describe("reveal-manager", () => {
  it("filters guessable positions and ignores spaces and hyphens", () => {
    const singleWord = "apple";
    expect(getGuessablePositions(singleWord)).toEqual([0, 1, 2, 3, 4]);

    const hyphenated = "ice-cream";
    const guessable = getGuessablePositions(hyphenated);
    // index 3 is '-'
    expect(guessable).not.toContain(3);
    expect(guessable.length).toBe(8);

    const spaced = "credit card";
    const spacedGuessable = getGuessablePositions(spaced);
    // index 6 is ' '
    expect(spacedGuessable).not.toContain(6);
    expect(spacedGuessable.length).toBe(10);
  });

  it("calculates initial reveal count based on length", () => {
    expect(getInitialRevealCount(3)).toBe(1);
    expect(getInitialRevealCount(4)).toBe(1);
    expect(getInitialRevealCount(5)).toBe(2);
    expect(getInitialRevealCount(7)).toBe(2);
    expect(getInitialRevealCount(8)).toBe(3);
    expect(getInitialRevealCount(10)).toBe(3);
    expect(getInitialRevealCount(11)).toBe(4);
    expect(getInitialRevealCount(15)).toBe(4);
  });

  it("generates a complete permutation without duplicates", () => {
    const word = "achievement";
    const order = generateRevealOrder(word);
    expect(order.length).toBe(11);
    const set = new Set(order);
    expect(set.size).toBe(11);
    for (let i = 0; i < 11; i++) {
      expect(order).toContain(i);
    }
  });

  it("automatically reveals spaces and hyphens in initial positions", () => {
    const phrase = "ice-cream";
    const order = generateRevealOrder(phrase);
    const { revealedPositions } = calculateInitialRevealedPositions(phrase, order);

    expect(revealedPositions[3]).toBe("-");
  });

  it("never reveals 100% of characters (respects maxRevealRatio)", () => {
    const word = "cat"; // 3 letters
    const maxAllowed = getMaxRevealedCount(3, 0.8);
    // 3 * 0.8 = 2.4 -> 2, always <= length - 1
    expect(maxAllowed).toBeLessThan(3);

    const longWord = "environment"; // 11 letters
    const maxLong = getMaxRevealedCount(11, 0.8);
    // 11 * 0.8 = 8.8 -> 8
    expect(maxLong).toBe(8);
  });

  it("progressively reveals letters and stops when max ratio is reached", () => {
    const word = "cat";
    const order = generateRevealOrder(word);
    const { revealedGuessableIndices } = calculateInitialRevealedPositions(word, order);

    // Initial revealed for 3-letter word is 1
    expect(revealedGuessableIndices.size).toBe(1);

    // Reveal next
    const hint1 = getNextReveal(word, order, revealedGuessableIndices, 0.8);
    expect(hint1).not.toBeNull();
    expect(revealedGuessableIndices.size).toBe(2);

    // Max allowed for 3 is 2. Next attempt should return null to protect last letter!
    const hint2 = getNextReveal(word, order, revealedGuessableIndices, 0.8);
    expect(hint2).toBeNull();
  });

  it("builds correct masked word string representation", () => {
    const word = "apple";
    const revealed: Record<number, string> = {
      1: "P",
      4: "E",
    };
    const masked = buildMaskedWord(word, revealed);
    expect(masked).toBe("_ P _ _ E");
  });
});
