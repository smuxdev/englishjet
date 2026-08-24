import { useState } from "react";
import { useVocabularyStorage, SESSION_SIZES } from "../hooks/vocabularyContext";
import { ProgressBar } from "./ProgressBar";
import { FilterTabs } from "./FilterTabs";
import { WordCard } from "./WordCard";
import { VoiceSelector } from "./VoiceSelector";
import { StudyDirectionToggle } from "./StudyDirectionToggle";
import { StudyModeToggle } from "./StudyModeToggle";
import { StudySession } from "./StudySession";
import { WordForm } from "./WordForm";
import { Modal } from "./Modal";
import { StatsPanel } from "./StatsPanel";
import { AppHeader } from "./HeaderVariants";

export const MainLayout = () => {
  const {
    state,
    words,
    dueWords,
    loading,
    loadError,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    goToPage,
    studyDirection,
    sessionSize,
    setSessionSize,
    canEdit,
    addWord,
  } = useVocabularyStorage();
  const [studying, setStudying] = useState(false);
  const [adding, setAdding] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader />

      {/* Barra con Estudiar + VoiceSelector + Progress: degradado suave estilo hero */}
      <div className="bg-gradient-to-br from-[#eef4fb] via-white to-[#fdf0ef] border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <p className="text-sm text-body">Aprende el inglés que se habla de verdad — con ejemplos, IPA y voz neuronal</p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {!studying && !loading && !loadError && (
                <>
                  <select
                    value={sessionSize}
                    onChange={(e) => setSessionSize(Number(e.target.value))}
                    className="text-xs rounded-lg px-2 py-1.5 border outline-none cursor-pointer bg-white text-slate-700 border-slate-300 focus:border-slate-400"
                    title="Palabras por sesión"
                    aria-label="Palabras por sesión"
                  >
                    {SESSION_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n} / sesión
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setStudying(true)}
                    disabled={dueWords.length === 0}
                    className="whitespace-nowrap rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed"
                    title={dueWords.length === 0 ? "No hay repasos pendientes hoy" : undefined}
                  >
                    {dueWords.length === 0 ? "Al día ✓" : `Repasar hoy (${dueWords.length}) →`}
                  </button>
                </>
              )}
              <VoiceSelector />
            </div>
          </div>
          <ProgressBar />
          <StatsPanel />
        </div>
      </div>

      {/* ===== SESIÓN DE ESTUDIO ===== */}
      {studying ? (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <StudySession onExit={() => setStudying(false)} />
        </main>
      ) : (

      /* ===== CONTENIDO ===== */
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ===== BUSCADOR + FILTROS + DIRECCIÓN ===== */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Buscar palabra en inglés o español..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-ink placeholder-slate-400 transition-colors focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StudyDirectionToggle />
              <StudyModeToggle />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterTabs filter={filter} onFilterChange={setFilter} />
            {canEdit && !adding && (
              <button
                onClick={() => setAdding(true)}
                className="rounded-lg border border-dashed border-primary/50 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
              >
                + Añadir palabra
              </button>
            )}
          </div>
        </section>

        {/* ===== ALTA DE PALABRA (modal) ===== */}
        {adding && (
          <Modal title="Añadir palabra" emoji="➕" onClose={() => setAdding(false)}>
            <WordForm
              bare
              initial={{ englishTerm: "", spanishTranslation: "", exampleSentence: "", pronunciation: "" }}
              onSave={async (fields) => {
                const error = await addWord(fields);
                if (!error) setAdding(false);
                return error;
              }}
              onCancel={() => setAdding(false)}
            />
          </Modal>
        )}

        {/* ===== TARJETAS DE PALABRAS ===== */}
        <section>
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <p className="text-slate-500 text-sm">Cargando vocabulario...</p>
            </div>
          ) : loadError ? (
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-12 text-center">
              <p className="text-red-600 text-sm font-medium mb-1">No se pudo cargar el vocabulario</p>
              <p className="text-slate-500 text-sm">Comprueba tu conexión y recarga la página</p>
            </div>
          ) : words.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p className="text-slate-500 text-sm">No se encontraron palabras</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {words.map((word) => (
                // La key incluye la dirección para remontar la tarjeta (y su
                // estado "revelado") al cambiar de modo de estudio.
                <WordCard key={`${word.id}-${studyDirection}`} word={word} />
              ))}
            </div>
          )}
        </section>

        {/* ===== PAGINACIÓN ===== */}
        {state.totalPages > 1 && (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 sm:px-5 py-3 flex items-center justify-between">
            <button
              onClick={() => goToPage(state.currentPage - 1)}
              disabled={state.currentPage <= 1}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Anterior
            </button>

            <span className="text-sm text-slate-500">
              Página <span className="font-semibold text-slate-700">{state.currentPage}</span> de <span className="font-semibold text-slate-700">{state.totalPages}</span>
            </span>

            <button
              onClick={() => goToPage(state.currentPage + 1)}
              disabled={state.currentPage >= state.totalPages}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </section>
        )}
      </main>
      )}
    </div>
  );
};
