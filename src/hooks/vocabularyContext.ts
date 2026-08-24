import { createContext, useContext } from "react";
import type { Word, FilterStatus } from "../types/vocabulary";

export type StudyDirection = "en->es" | "es->en";

export interface VocabularyState {
  learnedCount: number;
  pendingCount: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface VocabularyContextType {
  state: VocabularyState;
  words: Word[];
  loading: boolean;
  loadError: boolean;
  filter: FilterStatus;
  setFilter: (filter: FilterStatus) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  toggleLearned: (id: string) => void;
  goToPage: (page: number) => void;
  selectedVoice: string;
  setSelectedVoice: (name: string) => void;
  voices: SpeechSynthesisVoice[];
  studyDirection: StudyDirection;
  setStudyDirection: (dir: StudyDirection) => void;
}

export const VocabularyContext = createContext<VocabularyContextType | null>(null);

export function useVocabularyStorage() {
  const ctx = useContext(VocabularyContext);
  if (!ctx) throw new Error("useVocabularyStorage must be used within VocabularyProvider");
  return ctx;
}
