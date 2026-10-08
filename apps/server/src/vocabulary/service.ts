import { PartOfSpeech, VocabularyItem, VocabularyLevel, VocabularyCategory } from "@bufobia/shared";
import { VOCABULARY_DATA } from "./data.js";

export class VocabularyService {
  private words: VocabularyItem[];

  constructor(customWords?: VocabularyItem[]) {
    this.words = (customWords ?? VOCABULARY_DATA).map((word) => ({ ...word, partOfSpeech: word.partOfSpeech ?? this.inferPartOfSpeech(word.word) }));
  }

  public getRandomWords(
    count: number,
    filter?: { level?: VocabularyLevel; category?: VocabularyCategory }
  ): VocabularyItem[] {
    const seenWords = new Set<string>();
    const pool = this.words.filter((item) => {
      if (filter?.level && filter.level !== "ALL" && item.level !== filter.level) return false;
      if (filter?.category && filter.category !== "ALL" && item.category !== filter.category) return false;

      const word = item.word.toLowerCase();
      if (seenWords.has(word)) return false;
      seenWords.add(word);
      return true;
    });

    // Shuffle pool with Fisher-Yates
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  public getAll(): VocabularyItem[] {
    return this.words;
  }

  public getById(id: string): VocabularyItem | undefined {
    return this.words.find((item) => item.id === id);
  }

  private inferPartOfSpeech(word: string): PartOfSpeech {
    const normalized = word.toLowerCase();
    if (normalized.includes(" ") || normalized.includes("-")) return "PHRASE";
    if (normalized.endsWith("ly")) return "ADVERB";
    if (/(ous|ful|able|ible|ive|less|ish|al|ic)$/.test(normalized)) return "ADJECTIVE";
    // ponytail: suffix-based classification; replace with curated lexical metadata when grammatical precision matters.
    if (/(ate|ify|ise|ize|en)$/.test(normalized) || ["download", "upload", "debug", "monitor"].includes(normalized)) return "VERB";
    return "NOUN";
  }
}
