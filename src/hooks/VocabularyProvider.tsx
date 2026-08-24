import { useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import type { Word, FilterStatus } from "../types/vocabulary";
import {
  initializeWords,
  saveProgress,
  promote,
  demote,
  masteredProgress,
  resetProgress,
  todayStr,
  MAX_BOX,
  type WordProgress,
} from "../data/words";
import { readActivity, logReview, unlogReview, computeStreak, type ActivityMap } from "../data/activity";
import { PIPER_VOICE_ID } from "../services/piper";
import { probeCsvEditable, saveCsvToServer } from "../services/csvStore";
import {
  VocabularyContext,
  SESSION_SIZES,
  type VocabularyState,
  type StudyDirection,
  type StudyMode,
  type StudyStats,
  type WordEdit,
} from "./vocabularyContext";

const PAGE_SIZE = 10;
const FILTER_VALUES: readonly FilterStatus[] = ["all", "learned", "pending"];
const DIRECTION_VALUES: readonly StudyDirection[] = ["en->es", "es->en"];
const MODE_VALUES: readonly StudyMode[] = ["cards", "typing", "cloze"];

const DEFAULT_SESSION_SIZE = 20;

function readSessionSize(): number {
  const value = Number(localStorage.getItem("vocabulary_session_size"));
  return (SESSION_SIZES as readonly number[]).includes(value) ? value : DEFAULT_SESSION_SIZE;
}

function readStored<T extends string>(key: string, valid: readonly T[], fallback: T): T {
  const value = localStorage.getItem(key);
  return valid.includes(value as T) ? (value as T) : fallback;
}

function withProgress(word: Word, p: WordProgress): Word {
  return { ...word, box: p.box, due: p.due, learned: p.box >= MAX_BOX };
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
  const [sessionSize, setSessionSizeState] = useState<number>(readSessionSize);
  const [studyMode, setStudyModeState] = useState<StudyMode>(() =>
    readStored("vocabulary_study_mode", MODE_VALUES, "cards")
  );
  const [autoplay, setAutoplayState] = useState(
    () => localStorage.getItem("vocabulary_autoplay") === "1"
  );
  const [canEdit, setCanEdit] = useState(false);
  const [activity, setActivity] = useState<ActivityMap>(readActivity);

  useEffect(() => {
    let cancelled = false;
    probeCsvEditable().then((ok) => {
      if (!cancelled) setCanEdit(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const setSessionSize = useCallback((size: number) => {
    setSessionSizeState(size);
    localStorage.setItem("vocabulary_session_size", String(size));
  }, []);

  const setStudyMode = useCallback((mode: StudyMode) => {
    setStudyModeState(mode);
    localStorage.setItem("vocabulary_study_mode", mode);
  }, []);

  const setAutoplay = useCallback((on: boolean) => {
    setAutoplayState(on);
    localStorage.setItem("vocabulary_autoplay", on ? "1" : "0");
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

  const { learnedCount, inProgressCount } = useMemo(() => {
    let learned = 0;
    let inProgress = 0;
    for (const w of allWords) {
      if (w.learned) learned++;
      else if (w.box > 0) inProgress++;
    }
    return { learnedCount: learned, inProgressCount: inProgress };
  }, [allWords]);

  const today = todayStr();
  const dueWords = useMemo(
    () => allWords.filter((w) => w.due <= today),
    [allWords, today]
  );

  const stats: StudyStats = useMemo(() => {
    const boxCounts = new Array<number>(MAX_BOX + 1).fill(0);
    let dueTomorrow = 0;
    let dueWeek = 0;
    const tomorrow = todayStr(1);
    const weekEnd = todayStr(7);
    for (const w of allWords) {
      boxCounts[w.box]++;
      if (w.due > today && w.due <= weekEnd) {
        dueWeek++;
        if (w.due === tomorrow) dueTomorrow++;
      }
    }
    const day = activity[today];
    return {
      streak: computeStreak(activity),
      todayReviewed: day?.reviewed ?? 0,
      todayCorrect: day?.correct ?? 0,
      boxCounts,
      dueTomorrow,
      dueWeek,
    };
  }, [allWords, activity, today]);

  const state: VocabularyState = {
    learnedCount,
    inProgressCount,
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

  // Marcado manual desde el grid: dominada (caja 5) ↔ nueva (caja 0).
  const toggleLearned = useCallback((id: string) => {
    setAllWords((words) =>
      words.map((w) =>
        w.id === id ? withProgress(w, w.learned ? resetProgress() : masteredProgress()) : w
      )
    );
  }, []);

  // Transición Leitner desde la sesión: acierto sube de caja, fallo → caja 1.
  // El log de actividad se escribe aquí (cuerpo del handler, corre una vez),
  // nunca dentro de los updaters, que StrictMode ejecuta por duplicado.
  const reviewWord = useCallback(
    (id: string, correct: boolean) => {
      setAllWords((words) =>
        words.map((w) =>
          w.id === id ? withProgress(w, correct ? promote(w.box) : demote()) : w
        )
      );
      setActivity(logReview(activity, correct));
    },
    [activity]
  );

  // Deshacer de la sesión: restaura la caja/fecha previas de la palabra y
  // descuenta el repaso del log de actividad (el efecto de persistencia
  // re-escribe el progreso solo).
  const undoReview = useCallback(
    (id: string, prev: { box: number; due: string }, wasCorrect: boolean) => {
      setAllWords((words) => words.map((w) => (w.id === id ? withProgress(w, prev) : w)));
      setActivity(unlogReview(activity, wasCorrect));
    },
    [activity]
  );

  // CRUD con write-through al CSV: primero se escribe el fichero, y solo si
  // el servidor confirma se actualiza la memoria (sin estados intermedios que
  // revertir). Al cambiar el término inglés, el id pasa a ser el nuevo front y
  // el efecto de persistencia re-escribe el progreso bajo la nueva clave.
  const CSV_WRITE_ERROR = "No se pudo escribir el CSV (¿la app no corre bajo npm run dev?)";

  type ValidatedFields =
    | { error: string }
    | { error?: never; en: string; es: string; example: string; pronunciation: string | undefined };

  const validateFields = useCallback(
    (fields: WordEdit, excludeId: string | null): ValidatedFields => {
      const en = fields.englishTerm.trim();
      const es = fields.spanishTranslation.trim();
      if (!en || !es) return { error: "El término en inglés y la traducción son obligatorios" };
      if (
        allWords.some((w) => w.id !== excludeId && w.englishTerm.toLowerCase() === en.toLowerCase())
      ) {
        return { error: "Ya existe otra palabra con ese término en inglés" };
      }
      return {
        en,
        es,
        example: fields.exampleSentence.trim(),
        pronunciation: fields.pronunciation.trim() || undefined,
      };
    },
    [allWords]
  );

  const editWord = useCallback(
    async (id: string, fields: WordEdit): Promise<string | null> => {
      const v = validateFields(fields, id);
      if (v.error !== undefined) return v.error;
      const updated = allWords.map((w) =>
        w.id === id
          ? {
              ...w,
              id: v.en,
              englishTerm: v.en,
              spanishTranslation: v.es,
              exampleSentence: v.example,
              pronunciation: v.pronunciation,
              // el hint es siempre examples[0]; se conservan los extras del sidecar
              examples: [v.example, ...w.examples.filter((e) => e !== w.exampleSentence)].filter(Boolean),
            }
          : w
      );
      const ok = await saveCsvToServer(updated);
      if (!ok) return CSV_WRITE_ERROR;
      setAllWords(updated);
      return null;
    },
    [allWords, validateFields]
  );

  const addWord = useCallback(
    async (fields: WordEdit): Promise<string | null> => {
      const v = validateFields(fields, null);
      if (v.error !== undefined) return v.error;
      const word: Word = {
        id: v.en,
        englishTerm: v.en,
        spanishTranslation: v.es,
        exampleSentence: v.example,
        pronunciation: v.pronunciation,
        dateAdded: new Date().toISOString(),
        learned: false,
        box: 0,
        due: todayStr(),
        examples: v.example ? [v.example] : [],
      };
      const updated = [word, ...allWords];
      const ok = await saveCsvToServer(updated);
      if (!ok) return CSV_WRITE_ERROR;
      setAllWords(updated);
      return null;
    },
    [allWords, validateFields]
  );

  const deleteWord = useCallback(
    async (id: string): Promise<string | null> => {
      const updated = allWords.filter((w) => w.id !== id);
      if (updated.length === allWords.length) return "Palabra no encontrada";
      const ok = await saveCsvToServer(updated);
      if (!ok) return CSV_WRITE_ERROR;
      setAllWords(updated); // su progreso desaparece al re-persistir el mapa
      return null;
    },
    [allWords]
  );

  // Persistir progreso fuera del updater (StrictMode ejecuta los updaters dos veces).
  useEffect(() => {
    if (!loading && !loadError) saveProgress(allWords);
  }, [allWords, loading, loadError]);

  return (
    <VocabularyContext.Provider
      value={{
        state,
        words,
        dueWords,
        loading,
        loadError,
        filter,
        setFilter,
        searchTerm,
        setSearchTerm,
        toggleLearned,
        reviewWord,
        undoReview,
        canEdit,
        editWord,
        addWord,
        deleteWord,
        goToPage,
        sessionSize,
        setSessionSize,
        selectedVoice,
        setSelectedVoice,
        voices,
        studyDirection,
        setStudyDirection,
        studyMode,
        setStudyMode,
        autoplay,
        setAutoplay,
        stats,
      }}
    >
      {children}
    </VocabularyContext.Provider>
  );
}
