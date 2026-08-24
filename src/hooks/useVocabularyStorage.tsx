import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Word } from "../types/vocabulary";
import { initializeWords } from "../data/words";

export type StudyDirection = "en->es" | "es->en";

export interface VocabularyState {
  learnedCount: number;
  pendingCount: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

interface VocabularyContextType {
  state: VocabularyState;
  toggleLearned: (id: string) => void;
  getFilteredWords: (filter: string) => Word[];
  goToPage: (page: number, filter?: string) => void;
  selectedVoice: string;
  setSelectedVoice: (name: string) => void;
  voices: SpeechSynthesisVoice[];
  studyDirection: StudyDirection;
  setStudyDirection: (dir: StudyDirection) => void;
}

const PAGE_SIZE = 10;

const VocabularyContext = createContext<VocabularyContextType | null>(null);

export function useVocabularyStorage() {
  const ctx = useContext(VocabularyContext);
  if (!ctx) throw new Error("useVocabularyStorage must be used within VocabularyProvider");
  return ctx;
}

export function VocabularyProvider({ children }: { children: ReactNode }) {
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoiceState] = useState(
    () => localStorage.getItem("vocabulary_voice") || "piper-en_US-libritts-high"
  );
  const [studyDirection, setStudyDirectionState] = useState<StudyDirection>(
    () => (localStorage.getItem("vocabulary_direction") as StudyDirection) || "en->es"
  );
  const [state, setState] = useState<VocabularyState>({
    learnedCount: 0,
    pendingCount: 0,
    totalCount: 0,
    currentPage: 1,
    totalPages: 1,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const setSelectedVoice = useCallback((name: string) => {
    setSelectedVoiceState(name);
    localStorage.setItem("vocabulary_voice", name);
  }, []);

  const setStudyDirection = useCallback((dir: StudyDirection) => {
    setStudyDirectionState(dir);
    localStorage.setItem("vocabulary_direction", dir);
  }, []);

  const computeState = useCallback(
    (words: Word[], page: number, filter: string) => {
      let filtered = words;
      if (filter === "learned") filtered = words.filter((w) => w.learned);
      if (filter === "pending") filtered = words.filter((w) => !w.learned);

      const total = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      const safePage = Math.min(Math.max(1, page), total);
      const learned = words.filter((w) => w.learned).length;

      setState({
        learnedCount: learned,
        pendingCount: words.length - learned,
        totalCount: words.length,
        currentPage: safePage,
        totalPages: total,
        pageSize: PAGE_SIZE,
      });
    },
    []
  );

  useEffect(() => {
    initializeWords().then((initialWords) => {
      setAllWords(initialWords);
      const stored = localStorage.getItem("vocabulary_filter") || "all";
      computeState(initialWords, 1, stored);
    });
  }, [computeState]);

  const getFilteredWords = useCallback(
    (filter: string): Word[] => {
      let filtered = allWords;
      if (filter === "learned") filtered = allWords.filter((w) => w.learned);
      if (filter === "pending") filtered = allWords.filter((w) => !w.learned);
      const total = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      const safePage = Math.min(Math.max(1, state.currentPage), total);
      const start = (safePage - 1) * PAGE_SIZE;
      return filtered.slice(start, start + PAGE_SIZE);
    },
    [allWords, state.currentPage]
  );

  const goToPage = useCallback(
    (page: number, filter: string = "all") => {
      computeState(allWords, page, filter);
    },
    [allWords, computeState]
  );

  const toggleLearned = useCallback(
    (id: string) => {
      const updated = allWords.map((w) =>
        w.id === id ? { ...w, learned: !w.learned } : w
      );
      setAllWords(updated);
      localStorage.setItem("vocabulary_words", JSON.stringify(updated));
      const stored = localStorage.getItem("vocabulary_filter") || "all";
      computeState(updated, state.currentPage, stored);
    },
    [allWords, state.currentPage, computeState]
  );

  return (
    <VocabularyContext.Provider value={{
      state, toggleLearned, getFilteredWords, goToPage,
      selectedVoice, setSelectedVoice, voices,
      studyDirection, setStudyDirection
    }}>
      {children}
    </VocabularyContext.Provider>
  );
}
