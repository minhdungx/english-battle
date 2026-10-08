import { GAME_CONSTANTS } from "@bufobia/shared";

export interface ScoreCalculationParams {
  baseScore?: number;
  startedAt: number;
  endsAt: number;
  submittedAt: number;
  roundDurationMs: number;
  revealedCount: number;
  guessableLength: number;
}

export interface ScoreCalculationResult {
  score: number;
  responseTimeMs: number;
  timeFactor: number;
  hintFactor: number;
}

export function calculateScore(params: ScoreCalculationParams): ScoreCalculationResult {
  const {
    baseScore = GAME_CONSTANTS.BASE_SCORE,
    startedAt,
    endsAt,
    submittedAt,
    roundDurationMs,
    revealedCount,
    guessableLength,
  } = params;

  // 1. Calculate response time
  const responseTimeMs = Math.max(0, submittedAt - startedAt);

  // 2. Calculate remaining time & timeFactor
  const remainingTime = Math.max(0, endsAt - submittedAt);
  const timeFactor = roundDurationMs > 0 ? Math.min(1, Math.max(0, remainingTime / roundDurationMs)) : 0;

  // 3. Calculate hintFactor
  const safeGuessableLength = Math.max(1, guessableLength);
  const safeRevealedCount = Math.min(safeGuessableLength, Math.max(0, revealedCount));
  const hintFactor = Math.min(1, Math.max(0, 1 - safeRevealedCount / safeGuessableLength));

  // 4. Formula: baseScore * (0.6 + 0.4 * timeFactor) * (0.5 + 0.5 * hintFactor)
  const rawScore = baseScore * (0.6 + 0.4 * timeFactor) * (0.5 + 0.5 * hintFactor);
  const score = Math.max(0, Math.min(baseScore, Math.round(rawScore)));

  return {
    score,
    responseTimeMs,
    timeFactor: Number(timeFactor.toFixed(4)),
    hintFactor: Number(hintFactor.toFixed(4)),
  };
}
