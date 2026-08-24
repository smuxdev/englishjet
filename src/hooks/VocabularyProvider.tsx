import { useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import type { Word, FilterStatus } from "../types/vocabulary";
import { initializeWords, saveLearnedTerms } from "../data/words";
import { PIPER_VOICE_ID } from "../services/piper";
import {
  VocabularyContext,
  type VocabularyState,
  type StudyDirection,
} from "./vocabularyContext";

const PAGE_SIZE = 10;
const FILTER_VALUES: readonly FilterStatus[] = ["all", "learned", "pending"];
const DIRECTION_VALUES: readonly StudyDirection[] = ["en->es", "es->en"];

function readStored<T extends string>(key: string, valid: readonly T[], fallback: T): T {
  const value = localStorage.getItem(key);
  return valid.includes(value as T) ? (value as T) : fallback;
}

export function VocabularyProvider({ children }: { children: ReactNode }) {
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTermState] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [filter, setFilterState] = useState<FilterStatus>(() =>
    readStored("vocabulary_filter", FILTER_VALUES, "all")
  );
  const [selectedVoice, setSelectedVoiceState] = useState(
    () => localStorage.getItem("vocabulary_voice") || PIPER_VOICE_ID
  );
  const [studyDirection, setStudyDirectionState] = useState<StudyDirection>(() =>
    readStored("vocabulary_direction", DIRECTION_VALUES, "en->es")
  );

  useEffect(() => {
    let cancelled = false;
    initializeWords()
      .then((words) => {
        if (!cancelled) setAllWords(words);
      })
      .catch((error) => {
        console.error("Error loading vocabulary:", error);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const setSelectedVoice = useCallback((name: string) => {
    setSelectedVoiceState(name);
    localStorage.setItem("vocabulary_voice", name);
  }, []);

  const setStudyDirection = useCallback((dir: StudyDirection) => {
    setStudyDirectionState(dir);
    localStorage.setItem("vocabulary_direction", dir);
  }, []);

  const setFilter = useCallback((next: FilterStatus) => {
    setFilterState(next);
    localStorage.setItem("vocabulary_filter", next);
    setPage(1);
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);
    setPage(1);
  }, []);

  const filteredWords = useMemo(() => {
    let result = allWords;
    if (filter === "learned") result = result.filter((w) => w.learned);
    if (filter === "pending") result = result.filter((w) => !w.learned);
    const query = searchTerm.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (w) =>
          w.englishTerm.toLowerCase().includes(query) ||
          w.spanishTranslation.toLowerCase().includes(query) ||
          w.exampleSentence.toLowerCase().includes(query)
      );
    }
    return result;
  }, [allWords, filter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const words = useMemo(
    () => filteredWords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredWords, currentPage]
  );

  const learnedCount = useMemo(
    () => allWords.reduce((n, w) => n + (w.learned ? 1 : 0), 0),
    [allWords]
  );

  const state: VocabularyState = {
    learnedCount,
    pendingCount: allWords.length - learnedCount,
    totalCount: allWords.length,
    currentPage,
    totalPages,
    pageSize: PAGE_SIZE,
  };

  const goToPage = useCallback(
    (next: number) => setPage(Math.max(1, next)),
    []
  );

  const toggleLearned = useCallback((id: string) => {
    setAllWords((words) =>
      words.map((w) => (w.id === id ? { ...w, learned: !w.learned } : w))
    );
  }, []);

  // Persistir progreso fuera del updater (StrictMode ejecuta los updaters dos veces).
  useEffect(() => {
    if (!loading && !loadError) saveLearnedTerms(allWords);
  }, [allWords, loading, loadError]);

  return (
    <VocabularyContext.Provider
      value={{
        state,
        words,
        loading,
        loadError,
        filter,
        setFilter,
        searchTerm,
        setSearchTerm,
        toggleLearned,
        goToPage,
        selectedVoice,
        setSelectedVoice,
        voices,
        studyDirection,
        setStudyDirection,
      }}
    >
      {children}
    </VocabularyContext.Provider>
  );
}
