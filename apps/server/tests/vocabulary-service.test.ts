import { describe, expect, it } from "vitest";
import { VOCABULARY_DATA } from "../src/vocabulary/data.js";
import { VocabularyService } from "../src/vocabulary/service.js";

describe("vocabulary-service", () => {
  it("keeps filters strict and never repeats a word in one match", () => {
    const service = new VocabularyService([
      { id: "1", word: "apple", meaning: "táo", level: "A1", category: "Food & Health" },
      { id: "2", word: "apple", meaning: "táo", level: "A1", category: "Food & Health" },
      { id: "3", word: "network", meaning: "mạng", level: "B1", category: "Technology" },
    ]);

    expect(service.getRandomWords(10, { category: "Food & Health" })).toHaveLength(1);
    expect(service.getRandomWords(10, { category: "Food & Health" })[0].word).toBe("apple");
  });

  it("has a broad, unique catalogue for mixed matches", () => {
    const words = new VocabularyService().getRandomWords(1_000);
    expect(words.length).toBeGreaterThanOrEqual(350);
    expect(new Set(words.map((word) => word.word)).size).toBe(words.length);
    expect(words.every((word) => word.partOfSpeech)).toBe(true);
  });

  it("includes 2,000 distinct TOEIC 650 vocabulary entries", () => {
    const toeicWords = VOCABULARY_DATA.filter((word) => word.id.startsWith("toeic_650_"));

    expect(toeicWords).toHaveLength(2_000);
    expect(new Set(toeicWords.map((word) => word.word)).size).toBe(2_000);
    expect(toeicWords.every((word) => word.level === "B1" || word.level === "B2")).toBe(true);
  });
});
