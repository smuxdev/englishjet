import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Word } from "../types/vocabulary";
import {
  useVocabularyStorage,
  type StudyDirection,
  type StudyMode,
} from "../hooks/vocabularyContext";
import { checkAnswer, type Verdict } from "../services/answer";
import { findOccurrence, type ClozeMatch } from "../services/cloze";
import { readMySentences, saveMySentence, validateMySentence } from "../data/mySentences";
import { speakPiper, speakNative, isPiperVoice } from "../services/piper";
import { StudyCard } from "./StudyCard";

interface SessionCard {
  word: Word;
  failedOnce: boolean;
  // Frase elegida al azar entre word.examples al construir el deck: cada
  // sesión puede mostrar un contexto distinto (variabilidad de codificación)
  example: string;
  // Modo Contexto: hueco localizado en la frase; null = sin ocurrencia en
  // ninguna frase → la tarjeta cae al comportamiento de escritura ES→EN
  cloze: ClozeMatch | null;
  exampleIsMine: boolean; // la frase rotada es la escrita por el aprendiz
}

function makeCard(word: Word, mode: StudyMode, mySentence: string | undefined): SessionCard {
  // La frase propia entra en el pool de rotación (efecto de generación)
  const pool = mySentence ? [...word.examples, mySentence] : word.examples;
  if (mode === "cloze") {
    for (const example of shuffle(pool)) {
      const match = findOccurrence(example, word.englishTerm);
      if (match) {
        return { word, failedOnce: false, example, cloze: match, exampleIsMine: example === mySentence };
      }
    }
  }
  const example = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : "";
  return { word, failedOnce: false, example, cloze: null, exampleIsMine: example !== "" && example === mySentence };
}

const VERDICT_RANK: Record<Verdict, number> = { fail: 0, almost: 1, ok: 2 };
function bestVerdict(a: Verdict, b: Verdict): Verdict {
  return VERDICT_RANK[a] >= VERDICT_RANK[b] ? a : b;
}

// Efecto de generación: en el resumen, cada fallada invita a escribir tu
// propia frase con la palabra; entra en el pool de rotación de futuros repasos.
const MySentenceRow = ({ word }: { word: Word }) => {
  const [value, setValue] = useState(() => readMySentences()[word.id] ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const problem = validateMySentence(word.englishTerm, value);
    if (problem) {
      setError(problem);
      setSaved(false);
      return;
    }
    saveMySentence(word.id, value);
    setError(null);
    setSaved(true);
  };

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-white">{word.englishTerm}</span>
        <span className="text-sm text-slate-300 text-right">{word.spanishTranslation}</span>
      </div>
      <form onSubmit={handleSave} className="mt-1.5 flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
            setError(null);
          }}
          placeholder={`✍ Tu frase con «${word.englishTerm}»...`}
          className="flex-1 rounded-lg bg-white/10 border border-white/10 px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:border-white/40 outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
            saved ? "bg-mastered text-white" : "bg-white/15 text-white hover:bg-white/25"
          }`}
        >
          {saved ? "✓ Guardada" : "Guardar"}
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-300 text-left">{error}</p>}
    </div>
  );
};

interface SessionState {
  queue: SessionCard[]; // queue[0] = tarjeta actual; falladas se reencolan al final
  direction: StudyDirection; // fijada al iniciar la sesión
  mode: StudyMode; // fijado al iniciar, como la dirección
  revealed: boolean;
  typed: { input: string; verdict: Verdict } | null; // solo en modo escritura
  total: number;
  firstTry: number;
  failedWords: Word[];
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildSession(
  words: Word[],
  direction: StudyDirection,
  mode: StudyMode,
  size: number
): SessionState {
  // Prioridad a las revisiones vencidas (caja > 0) sobre las nuevas, para que
  // el backlog de repaso no se ahogue entre palabras nuevas; el orden final
  // se baraja para mezclarlas dentro de la sesión.
  const reviews = shuffle(words.filter((w) => w.box > 0));
  const fresh = shuffle(words.filter((w) => w.box === 0));
  const deck = shuffle([...reviews, ...fresh].slice(0, size));
  const mine = readMySentences();
  return {
    queue: deck.map((word) => makeCard(word, mode, mine[word.id])),
    direction,
    mode,
    revealed: false,
    typed: null,
    total: deck.length,
    firstTry: 0,
    failedWords: [],
  };
}

export const StudySession = ({ onExit }: { onExit: () => void }) => {
  const {
    dueWords,
    reviewWord,
    studyDirection,
    studyMode,
    sessionSize,
    autoplay,
    setAutoplay,
    selectedVoice,
    voices,
  } = useVocabularyStorage();
  const [session, setSession] = useState<SessionState>(() =>
    buildSession(dueWords, studyDirection, studyMode, sessionSize)
  );
  const [draft, setDraft] = useState("");

  const current = session.queue[0];
  const remainingUnique = new Set(session.queue.map((c) => c.word.id)).size;
  const done = session.total - remainingUnique;

  // Guarda contra doble respuesta: el listener de teclado puede ejecutarse con
  // un closure obsoleto entre el re-render y el re-registro del efecto, y un
  // segundo toggleLearned des-aprendería la palabra. Cada reveal habilita
  // exactamente una respuesta.
  const canAnswer = useRef(false);

  const reveal = () => {
    canAnswer.current = true;
    setSession((s) => (s.revealed ? s : { ...s, revealed: true }));
  };

  const answer = (knew: boolean) => {
    const card = session.queue[0];
    if (!card || !session.revealed || !canAnswer.current) return;
    canAnswer.current = false;
    setDraft("");
    // Transición Leitner una sola vez por palabra y sesión: acierto a la
    // primera sube de caja; el primer fallo baja a caja 1. Las reencoladas
    // que luego aciertan ya transicionaron con su fallo.
    if (!card.failedOnce) reviewWord(card.word.id, knew);
    setSession((s) => {
      const [head, ...rest] = s.queue;
      if (!head) return s;
      if (knew) {
        return {
          ...s,
          queue: rest,
          revealed: false,
          typed: null,
          firstTry: head.failedOnce ? s.firstTry : s.firstTry + 1,
        };
      }
      const alreadyFailed = s.failedWords.some((w) => w.id === head.word.id);
      return {
        ...s,
        queue: [...rest, { ...head, failedOnce: true }],
        revealed: false,
        typed: null,
        failedWords: alreadyFailed ? s.failedWords : [...s.failedWords, head.word],
      };
    });
  };

  // En escritura la respuesta la corrige checkAnswer; el input hace de submit
  // (antes de revelar) y de «Continuar» (después, Enter con el foco dentro).
  const handleTypedSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!current) return;
    if (session.revealed) {
      if (session.typed) answer(session.typed.verdict !== "fail");
      return;
    }
    if (!draft.trim()) return;
    let verdict: Verdict;
    if (session.mode === "cloze") {
      // vale tanto el lema («cobweb») como la forma de la frase («cobwebs»)
      verdict = checkAnswer(draft, current.word.englishTerm);
      if (current.cloze) verdict = bestVerdict(verdict, checkAnswer(draft, current.cloze.surface));
    } else {
      const target =
        session.direction === "en->es" ? current.word.spanishTranslation : current.word.englishTerm;
      verdict = checkAnswer(draft, target);
    }
    canAnswer.current = true;
    setSession((s) => ({ ...s, revealed: true, typed: { input: draft, verdict } }));
  };

  // Autoplay: EN→ES pronuncia el término al aparecer la tarjeta; ES→EN al
  // revelarse (es cuando el inglés se hace visible). spokenRef evita repetir
  // la misma clave en re-renders y en el doble-efecto de StrictMode.
  const spokenRef = useRef<string | null>(null);
  const cardId = current?.word.id ?? null;
  useEffect(() => {
    if (!autoplay || !cardId || !current) return;
    // En Contexto se pronuncia la frase completa al revelarse
    const wantsBack = session.mode === "cloze" || session.direction === "es->en";
    if (wantsBack && !session.revealed) return;
    const key = `${cardId}:${wantsBack ? "back" : "front"}`;
    if (spokenRef.current === key) return;
    spokenRef.current = key;
    const text =
      session.mode === "cloze" && current.example ? current.example : current.word.englishTerm;
    if (isPiperVoice(selectedVoice)) {
      void speakPiper(text);
    } else {
      speakNative(text, selectedVoice, voices);
    }
  }, [autoplay, cardId, session.revealed, session.direction, session.mode, current, selectedVoice, voices]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (session.mode === "cards") {
        if (e.key === " ") {
          e.preventDefault(); // evita scroll y activación del botón enfocado
          reveal();
        } else if (e.key === "1") {
          answer(false);
        } else if (e.key === "2") {
          answer(true);
        }
      } else if (e.key === "Enter" && session.revealed && session.typed) {
        // Continuar con el foco fuera del input (p.ej. tras clic en Comprobar)
        answer(session.typed.verdict !== "fail");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ===== Resumen final ===== */
  if (!current) {
    return (
      <section className="max-w-xl mx-auto space-y-4">
        <div className="relative overflow-hidden bg-ink rounded-xl shadow-md p-8 text-center">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/5" aria-hidden="true" />
          <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-accent/10" aria-hidden="true" />
          <h2 className="relative font-display text-2xl font-black text-white mb-1">🎉 ¡Sesión completada!</h2>
          <p className="relative text-sm text-slate-300 mb-6">
            {session.total} {session.total === 1 ? "palabra" : "palabras"} · {session.firstTry} a la primera · {session.failedWords.length} {session.failedWords.length === 1 ? "fallada" : "falladas"}
          </p>

          {session.failedWords.length > 0 && (
            <div className="relative mb-2 text-left bg-white/10 rounded-lg divide-y divide-white/10">
              {session.failedWords.map((w) => (
                <MySentenceRow key={w.id} word={w} />
              ))}
            </div>
          )}
          {session.failedWords.length > 0 && (
            <p className="relative text-xs text-slate-400 mb-6">
              Escribir tu propia frase con la palabra ayuda a fijarla (efecto de generación); se mostrará en tus repasos.
            </p>
          )}

          <div className="relative flex flex-col sm:flex-row justify-center gap-2">
            {session.failedWords.length > 0 && (
              <button
                onClick={() => setSession((s) => buildSession(s.failedWords, s.direction, s.mode, sessionSize))}
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
              >
                Repetir falladas ({session.failedWords.length})
              </button>
            )}
            {dueWords.length > 0 && (
              <button
                onClick={() => setSession(buildSession(dueWords, studyDirection, studyMode, sessionSize))}
                className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
              >
                Otra ronda ({Math.min(dueWords.length, sessionSize)})
              </button>
            )}
            <button
              onClick={onExit}
              className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Terminar
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* ===== Tarjeta en curso ===== */
  const typedAnswerText =
    session.mode === "cloze"
      ? current.cloze?.surface ?? current.word.englishTerm
      : session.direction === "en->es"
        ? current.word.spanishTranslation
        : current.word.englishTerm;

  return (
    <section className="max-w-xl mx-auto space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 sm:px-5 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-sm font-bold text-ink">
            Sesión de estudio <span className="text-slate-400 font-normal">· {session.mode === "cloze" ? "Contexto" : `${session.direction === "en->es" ? "EN → ES" : "ES → EN"}${session.mode === "typing" ? " · Escribir" : ""}`}</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoplay(!autoplay)}
              aria-pressed={autoplay}
              aria-label="Pronunciación automática"
              title={autoplay ? "Pronunciación automática: activada" : "Pronunciación automática: desactivada"}
              className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                autoplay ? "bg-primary text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              🔊 auto
            </button>
            <span className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{done}</span>/{session.total}
            </span>
            <button
              onClick={onExit}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
            >
              Salir
            </button>
          </div>
        </div>
        <div className="w-full rounded-full h-1.5 bg-slate-200">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out bg-primary"
            style={{ width: `${session.total > 0 ? (done / session.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {session.mode === "cloze" && current.cloze ? (
        /* ===== Tarjeta Contexto: la frase con el hueco ===== */
        <div className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200 text-center">
          <div className="h-[3px] w-full bg-gradient-to-r from-primary via-accent to-review" />
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-primary/5" aria-hidden="true" />
          <div className="relative p-6 sm:p-10">
            <p className="font-display text-lg sm:text-xl font-bold text-ink leading-relaxed max-w-lg mx-auto">
              {current.cloze.parts.map((part, i) =>
                part.hit ? (
                  session.revealed ? (
                    <mark key={i} className="bg-primary/10 text-primary-dark rounded px-1">
                      {part.text}
                    </mark>
                  ) : (
                    <span
                      key={i}
                      className="inline-block align-baseline min-w-14 mx-0.5 border-b-2 border-primary/60 text-transparent select-none"
                      aria-label="hueco"
                    >
                      ____
                    </span>
                  )
                ) : (
                  <span key={i}>{part.text}</span>
                )
              )}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Pista: <span className="font-semibold text-primary-dark">{current.word.spanishTranslation}</span>
            </p>
            {session.revealed && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="font-display text-xl font-bold text-ink">
                  {current.word.englishTerm}
                  {current.word.pronunciation && (
                    <span className="ml-2 text-sm font-mono font-normal text-slate-500">{current.word.pronunciation}</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <StudyCard
          key={current.word.id}
          word={current.word}
          example={current.example}
          exampleIsMine={current.exampleIsMine}
          direction={session.mode === "cloze" ? "es->en" : session.direction}
          revealed={session.revealed}
          onReveal={reveal}
          showRevealButton={session.mode === "cards"}
        />
      )}

      {session.mode !== "cards" ? (
        <form onSubmit={handleTypedSubmit} className="space-y-3">
          {!session.revealed ? (
            <div className="flex gap-2">
              <input
                key={current.word.id}
                autoFocus
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  session.mode === "cloze"
                    ? "Escribe la palabra que falta..."
                    : session.direction === "en->es"
                      ? "Escribe la traducción en español..."
                      : "Escribe la palabra en inglés..."
                }
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-40"
              >
                Comprobar <span className="font-normal opacity-70 hidden sm:inline">· ⏎</span>
              </button>
            </div>
          ) : (
            session.typed && (
              <div className="space-y-3">
                {session.typed.verdict === "ok" ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-mastered">
                    ✓ Correcto
                  </div>
                ) : session.typed.verdict === "almost" ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <span className="font-semibold">≈ Casi</span> — escribiste «{session.typed.input}»; la forma correcta es{" "}
                    <span className="font-semibold">{typedAnswerText}</span>
                  </div>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <span className="font-semibold">✗ Incorrecto</span> — escribiste{" "}
                    <span className="line-through">{session.typed.input}</span>; la respuesta era{" "}
                    <span className="font-semibold">{typedAnswerText}</span>
                  </div>
                )}
                <button
                  type="submit"
                  autoFocus
                  className="w-full rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
                >
                  Continuar <span className="font-normal opacity-70 hidden sm:inline">· ⏎</span>
                </button>
              </div>
            )
          )}
        </form>
      ) : (
        session.revealed && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => answer(false)}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              ✗ Aún no <span className="font-normal text-red-400 hidden sm:inline">· 1</span>
            </button>
            <button
              onClick={() => answer(true)}
              className="rounded-xl border border-green-200 bg-green-50 px-4 py-3.5 text-sm font-semibold text-mastered transition-colors hover:bg-green-100"
            >
              ✓ La sabía <span className="font-normal text-green-500 hidden sm:inline">· 2</span>
            </button>
          </div>
        )
      )}
    </section>
  );
};
