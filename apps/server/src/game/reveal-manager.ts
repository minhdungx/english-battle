import { GAME_CONSTANTS } from "@bufobia/shared";

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getGuessablePositions(word: string): number[] {
  const positions: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (/[a-zA-Z]/.test(word[i])) {
      positions.push(i);
    }
  }
  return positions;
}

export function getInitialRevealCount(guessableLength: number): number {
  if (guessableLength <= 4) return 1;
  if (guessableLength <= 7) return 2;
  if (guessableLength <= 10) return 3;
  return 4;
}

export function generateRevealOrder(word: string): number[] {
  const guessablePositions = getGuessablePositions(word);
  return shuffle(guessablePositions);
}

export function getMaxRevealedCount(guessableLength: number, maxRatio: number = GAME_CONSTANTS.MAX_REVEAL_RATIO): number {
  if (guessableLength <= 1) return 0;
  // Always reserve at least 1 hidden letter so player must guess
  const calculatedMax = Math.floor(guessableLength * maxRatio);
  return Math.max(1, Math.min(calculatedMax, guessableLength - 1));
}

export function calculateInitialRevealedPositions(
  word: string,
  revealOrder: number[]
): {
  revealedPositions: Record<number, string>;
  revealedGuessableIndices: Set<number>;
  initialCount: number;
} {
  const revealedPositions: Record<number, string> = {};
  const revealedGuessableIndices = new Set<number>();

  // 1. Pre-reveal non-alphabetical characters (spaces, hyphens, apostrophes)
  for (let i = 0; i < word.length; i++) {
    if (!/[a-zA-Z]/.test(word[i])) {
      revealedPositions[i] = word[i];
    }
  }

  // 2. Reveal initial N letters from revealOrder
  const guessableCount = getGuessablePositions(word).length;
  const initialCount = Math.min(
    getInitialRevealCount(guessableCount),
    getMaxRevealedCount(guessableCount)
  );

  const initialIndices = revealOrder.slice(0, initialCount);
  for (const idx of initialIndices) {
    revealedPositions[idx] = word[idx].toUpperCase();
    revealedGuessableIndices.add(idx);
  }

  return {
    revealedPositions,
    revealedGuessableIndices,
    initialCount,
  };
}

export function getNextReveal(
  word: string,
  revealOrder: number[],
  revealedGuessableIndices: Set<number>,
  maxRatio: number = GAME_CONSTANTS.MAX_REVEAL_RATIO
): { position: number; character: string } | null {
  const guessablePositions = getGuessablePositions(word);
  const maxAllowed = getMaxRevealedCount(guessablePositions.length, maxRatio);

  if (revealedGuessableIndices.size >= maxAllowed) {
    return null;
  }

  // Find next position in revealOrder that is not yet revealed
  for (const pos of revealOrder) {
    if (!revealedGuessableIndices.has(pos)) {
      revealedGuessableIndices.add(pos);
      return {
        position: pos,
        character: word[pos].toUpperCase(),
      };
    }
  }

  return null;
}

export function buildMaskedWord(word: string, revealedPositions: Record<number, string>): string {
  return [...word]
    .map((char, index) => (revealedPositions[index] ? revealedPositions[index] : "_"))
    .join(" ");
}
