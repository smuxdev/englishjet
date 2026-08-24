import { useState } from "react";
import { useVocabularyStorage } from "../hooks/vocabularyContext";
import { MAX_BOX } from "../data/words";

const BOX_LABELS = ["Nuevas", "Caja 1", "Caja 2", "Caja 3", "Caja 4", "Dominadas"];

export const StatsPanel = () => {
  const { stats, state } = useVocabularyStorage();
  const [open, setOpen] = useState(false);

  const maxBox = Math.max(1, ...stats.boxCounts);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Estadísticas
        <span className="text-slate-400 font-normal">
          🔥 {stats.streak} {stats.streak === 1 ? "día" : "días"} · hoy {stats.todayCorrect}/{stats.todayReviewed}
        </span>
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500 mb-1">Racha</p>
            <p className="text-lg font-bold text-slate-900">
              🔥 {stats.streak} {stats.streak === 1 ? "día" : "días"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Hoy: {stats.todayReviewed} {stats.todayReviewed === 1 ? "repasada" : "repasadas"} · {stats.todayCorrect} ✓
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500 mb-2">Cajas Leitner</p>
            <div className="space-y-1">
              {Array.from({ length: MAX_BOX + 1 }, (_, box) => (
                <div key={box} className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 text-slate-500">{BOX_LABELS[box]}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${box === MAX_BOX ? "bg-[#751200]" : box === 0 ? "bg-slate-400" : "bg-amber-400"}`}
                      style={{ width: `${(stats.boxCounts[box] / maxBox) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right font-medium text-slate-700">{stats.boxCounts[box]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500 mb-1">Próximos repasos</p>
            <p className="text-slate-700">
              Mañana: <span className="font-semibold">{stats.dueTomorrow}</span>
            </p>
            <p className="text-slate-700">
              Próximos 7 días: <span className="font-semibold">{stats.dueWeek}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {state.totalCount} palabras en total
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
