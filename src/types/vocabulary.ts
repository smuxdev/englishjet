export interface Word {
  id: string;
  englishTerm: string;
  spanishTranslation: string;
  exampleSentence: string;
  dateAdded: string;
  learned: boolean; // derivado: box === MAX_BOX (dominada)
  box: number; // 0 = nueva, 1..5 cajas Leitner
  due: string; // YYYY-MM-DD de la próxima revisión
  pronunciation?: string;
}

export type FilterStatus = "all" | "learned" | "pending";

export interface VocabularyState {
  words: Word[];
  learnedCount: number;
  pendingCount: number;
  totalCount: number;
}