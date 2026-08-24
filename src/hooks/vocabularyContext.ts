import { createContext, useContext } from "react";
import type { Word, FilterStatus } from "../types/vocabulary";

export type StudyDirection = "en->es" | "es->en";
export type StudyMode = "cards" | "typing";

export const SESSION_SIZES = [10, 20, 30, 50] as const;

export interface StudyStats {
  streak: number;
  todayReviewed: number;
  todayCorrect: number;
  boxCounts: number[]; // índice = caja 0..5
  dueTomorrow: number;
  dueWeek: number; // vencen en los próximos 7 días (sin contar hoy)
}

export interface WordEdit {
  englishTerm: string;
  spanishTranslation: string;
  exampleSentence: string;
  pronunciation: string;
}

export interface VocabularyState {
  learnedCount: number;
  inProgressCount: number; // cajas 1..4 (en repaso)
  pendingCount: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface VocabularyContextType {
  state: VocabularyState;
  words: Word[];
  dueWords: Word[]; // pendientes de repasar hoy (nuevas + revisiones vencidas)
  loading: boolean;
  loadError: boolean;
  filter: FilterStatus;
  setFilter: (filter: FilterStatus) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  toggleLearned: (id: string) => void;
  reviewWord: (id: string, correct: boolean) => void;
  canEdit: boolean; // hay endpoint de escritura del CSV (solo `npm run dev`)
  editWord: (id: string, fields: WordEdit) => Promise<string | null>; // null = ok, string = error
  addWord: (fields: WordEdit) => Promise<string | null>;
  deleteWord: (id: string) => Promise<string | null>;

  goToPage: (page: number) => void;
  sessionSize: number;
  setSessionSize: (size: number) => void;
  selectedVoice: string;
  setSelectedVoice: (name: string) => void;
  voices: SpeechSynthesisVoice[];
  studyDirection: StudyDirection;
  setStudyDirection: (dir: StudyDirection) => void;
  studyMode: StudyMode;
  setStudyMode: (mode: StudyMode) => void;
  autoplay: boolean;
  setAutoplay: (on: boolean) => void;
  stats: StudyStats;
}

export const VocabularyContext = createContext<VocabularyContextType | null>(null);

export function useVocabularyStorage() {
  const ctx = useContext(VocabularyContext);
  if (!ctx) throw new Error("useVocabularyStorage must be used within VocabularyProvider");
  return ctx;
}
