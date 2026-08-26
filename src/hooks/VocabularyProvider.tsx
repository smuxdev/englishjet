import { useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import type { Word, FilterStatus } from "../types/vocabulary";
import {
  promote,
  demote,
  masteredProgress,
  resetProgress,
  todayStr,
  MAX_BOX,
  type WordProgress,
} from "../data/words";
import { applyReview, applyUnreview, computeStreak, type ActivityMap } from "../data/activity";
import { PIPER_VOICE_ID } from "../services/piper";
import type { DeckStore } from "../services/deckStore";
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

// El store (local = CSV+localStorage, remote = API por usuario) llega por
// props; App remonta este provider con key al cambiar de identidad, así que
// aquí no hay lógica de recarga entre modos.
export function VocabularyProvider({ store, children }: { store: DeckStore; children: ReactNode }) {
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
  const [activity, setActivity] = useState<ActivityMap>({});
  const [mySentences, setMySentences] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    store.probeCanEdit().then((ok) => {
      if (!cancelled) setCanEdit(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  useEffect(() => {
    let cancelled = false;
    store
      .load()
      .then((data) => {
        if (cancelled) return;
        setAllWords(data.words);
        setActivity(data.activity);
        setMySentences(data.mySentences);
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
  }, [store]);

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
  const toggleLearned = useCallback(
    (id: string) => {
      const word = allWords.find((w) => w.id === id);
      if (!word) return;
      const p = word.learned ? resetProgress() : masteredProgress();
      setAllWords((words) => words.map((w) => (w.id === id ? withProgress(w, p) : w)));
      store.persistProgress(word, p);
    },
    [allWords, store]
  );

  // Transición Leitner desde la sesión: acierto sube de caja, fallo → caja 1.
  // El log de actividad y la sincronización se hacen aquí (cuerpo del handler,
  // corre una vez), nunca dentro de los updaters, que StrictMode duplica.
  const reviewWord = useCallback(
    (id: string, correct: boolean) => {
      const word = allWords.find((w) => w.id === id);
      if (!word) return;
      const p = correct ? promote(word.box) : demote();
      setAllWords((words) => words.map((w) => (w.id === id ? withProgress(w, p) : w)));
      const nextActivity = applyReview(activity, correct);
      setActivity(nextActivity);
      store.persistProgress(word, p);
      store.logActivity(nextActivity, { reviewed: 1, correct: correct ? 1 : 0 });
    },
    [allWords, activity, store]
  );

  // Deshacer de la sesión: restaura la caja/fecha previas de la palabra y
  // descuenta el repaso del log de actividad.
  const undoReview = useCallback(
    (id: string, prev: { box: number; due: string }, wasCorrect: boolean) => {
      const word = allWords.find((w) => w.id === id);
      if (!word) return;
      setAllWords((words) => words.map((w) => (w.id === id ? withProgress(w, prev) : w)));
      const nextActivity = applyUnreview(activity, wasCorrect);
      setActivity(nextActivity);
      store.persistProgress(word, prev);
      store.logActivity(nextActivity, { reviewed: -1, correct: wasCorrect ? -1 : 0 });
    },
    [allWords, activity, store]
  );

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

  // CRUD write-through: primero confirma el store (CSV o API) y solo entonces
  // se actualiza la memoria (sin estados intermedios que revertir).
  const editWord = useCallback(
    async (id: string, fields: WordEdit): Promise<string | null> => {
      const v = validateFields(fields, id);
      if (v.error !== undefined) return v.error;
      const word = allWords.find((w) => w.id === id);
      if (!word) return "Palabra no encontrada";
      const result = await store.editWord(
        word,
        { en: v.en, es: v.es, example: v.example, pronunciation: v.pronunciation },
        allWords
      );
      if ("error" in result) return result.error;
      setAllWords(allWords.map((w) => (w.id === id ? result.word : w)));
      // En local el id es el término: si cambió, la frase propia migra de clave.
      const newId = result.word.id;
      if (newId !== id && mySentences[id] !== undefined) {
        const sentence = mySentences[id];
        setMySentences((m) => {
          const { [id]: _moved, ...rest } = m;
          return { ...rest, [newId]: sentence };
        });
        store.saveMySentence(newId, sentence);
      }
      return null;
    },
    [allWords, mySentences, store, validateFields]
  );

  const addWord = useCallback(
    async (fields: WordEdit): Promise<string | null> => {
      const v = validateFields(fields, null);
      if (v.error !== undefined) return v.error;
      const result = await store.addWord(
        { en: v.en, es: v.es, example: v.example, pronunciation: v.pronunciation },
        allWords
      );
      if ("error" in result) return result.error;
      setAllWords([result.word, ...allWords]);
      return null;
    },
    [allWords, store, validateFields]
  );

  const deleteWord = useCallback(
    async (id: string): Promise<string | null> => {
      if (!allWords.some((w) => w.id === id)) return "Palabra no encontrada";
      const error = await store.deleteWord(id, allWords);
      if (error) return error;
      setAllWords(allWords.filter((w) => w.id !== id)); // su progreso se va con la tarjeta
      return null;
    },
    [allWords, store]
  );

  const setMySentence = useCallback(
    (id: string, sentence: string) => {
      setMySentences((m) => ({ ...m, [id]: sentence }));
      store.saveMySentence(id, sentence);
    },
    [store]
  );

  const importSampleDeck = useCallback(async (): Promise<string | null> => {
    const error = await store.importSampleDeck();
    if (error) return error;
    setLoading(true);
    try {
      const data = await store.load();
      setAllWords(data.words);
      setActivity(data.activity);
      setMySentences(data.mySentences);
    } catch (loadError) {
      console.error("Error reloading after import:", loadError);
      return "Importado, pero no se pudo recargar el mazo — recarga la página";
    } finally {
      setLoading(false);
    }
    return null;
  }, [store]);

  // Persistir progreso fuera del updater (StrictMode ejecuta los updaters dos
  // veces). En remoto es no-op: cada transición ya hizo su PATCH.
  useEffect(() => {
    if (!loading && !loadError) store.persistAllProgress(allWords);
  }, [allWords, loading, loadError, store]);

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
        mySentences,
        setMySentence,
        canImport: store.mode === "remote",
        importSampleDeck,
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
