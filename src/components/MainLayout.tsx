import { useState, useCallback } from "react";
import { useVocabularyStorage } from "../hooks/useVocabularyStorage";
import { ProgressBar } from "./ProgressBar";
import { FilterTabs } from "./FilterTabs";
import { WordCard } from "./WordCard";
import { VoiceSelector } from "./VoiceSelector";
import { StudyDirectionToggle } from "./StudyDirectionToggle";
import { AppHeader } from "./HeaderVariants";

export const MainLayout = () => {
  const { state, goToPage, getFilteredWords } = useVocabularyStorage();
  const [filter, setFilter] = useState<"all" | "learned" | "pending">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredWords = getFilteredWords(filter);

  const displayedWords = searchTerm
    ? filteredWords.filter(
        (w) =>
          w.englishTerm.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.spanishTranslation.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.exampleSentence.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : filteredWords;

  const handleFilterChange = useCallback(
    (newFilter: "all" | "learned" | "pending") => {
      setFilter(newFilter);
      localStorage.setItem("vocabulary_filter", newFilter);
      goToPage(1, newFilter);
    },
    [goToPage]
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader />

      {/* Barra con VoiceSelector + Progress */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <p className="text-sm text-slate-500">Aprende vocabulario en inglés con ejemplos reales</p>
            <VoiceSelector variant={1} />
          </div>
          <ProgressBar variant={1} />
        </div>
      </div>

      {/* ===== CONTENIDO ===== */}
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
                className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-[#751200] focus:bg-white focus:ring-1 focus:ring-[#751200] outline-none"
              />
            </div>
            <StudyDirectionToggle />
          </div>
          <FilterTabs filter={filter} onFilterChange={handleFilterChange} />
        </section>

        {/* ===== TARJETAS DE PALABRAS ===== */}
        <section>
          {displayedWords.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p className="text-slate-500 text-sm">No se encontraron palabras</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedWords.map((word: any) => (
                <WordCard key={word.id} word={word} />
              ))}
            </div>
          )}
        </section>

        {/* ===== PAGINACIÓN ===== */}
        {!searchTerm && state.totalPages > 1 && (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 sm:px-5 py-3 flex items-center justify-between">
            <button
              onClick={() => goToPage(state.currentPage - 1, filter)}
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
              onClick={() => goToPage(state.currentPage + 1, filter)}
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
    </div>
  );
};
