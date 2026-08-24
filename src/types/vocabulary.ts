export interface Word {
  id: string;
  englishTerm: string;
  spanishTranslation: string;
  exampleSentence: string;
  dateAdded: string;
  learned: boolean;
  pronunciation?: string;
}

export type FilterStatus = "all" | "learned" | "pending";

export interface VocabularyState {
  words: Word[];
  learnedCount: number;
  pendingCount: number;
  totalCount: number;
}