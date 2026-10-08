export const GAME_CONSTANTS = {
  DEFAULT_ROUNDS_COUNT: 10,
  DEFAULT_ROUND_DURATION_MS: 20000,
  DEFAULT_REVEAL_INTERVAL_MS: 3000,
  DEFAULT_RACE_DURATION_MS: 120000,
  MAX_REVEAL_RATIO: 0.8,
  COUNTDOWN_DURATION_MS: 3000,
  ROUND_RESULT_DURATION_MS: 2000,
  SUBMIT_COOLDOWN_MS: 300,
  BASE_SCORE: 1000,
  DISCONNECT_GRACE_PERIOD_MS: 45000,
  ROOM_CODE_LENGTH: 5,
} as const;

export const VOCABULARY_LEVELS = ["ALL", "A1", "A2", "B1", "B2", "C1"] as const;
export type VocabularyLevel = (typeof VOCABULARY_LEVELS)[number];

export const VOCABULARY_CATEGORIES = [
  "ALL",
  "General",
  "Daily Life",
  "Technology",
  "Business & Work",
  "Education",
  "Travel & Nature",
  "Food & Health",
] as const;
export type VocabularyCategory = (typeof VOCABULARY_CATEGORIES)[number];
