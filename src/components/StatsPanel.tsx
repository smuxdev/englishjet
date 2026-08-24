import { useState, type ReactNode } from "react";
import { useVocabularyStorage } from "../hooks/vocabularyContext";
import { MAX_BOX } from "../data/words";

const BOX_LABELS = ["Nuevas", "Caja 1", "Caja 2", "Caja 3", "Caja 4", "Dominadas"];

// Tarjeta estilo YDA: barra superior de color, emoji en tile pastel y
// círculo decorativo suave en la esquina.
const StatCard = ({
  emoji,
  title,
  barClass,
  tintClass,
  children,
}: {
  emoji: string;
  title: string;
  barClass: string;
  tintClass: string;
  children: ReactNode;
}) => (
  <div className="relative overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm">
    <div className={`h-[3px] w-full ${barClass}`} />
    <div className={`absolute -top-5 -right-5 w-20 h-20 rounded-full ${tintClass}`} aria-hidden="true" />
    <div className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${tintClass}`} aria-hidden="true">
          {emoji}
        </span>
        <p className="font-display font-bold text-ink text-sm">{title}</p>
      </div>
      {children}
    </div>
  </div>
);

export const StatsPanel = () => {
  const { stats, state } = useVocabularyStorage();
  const [open, setOpen] = useState(false);

  const maxBox = Math.max(1, ...stats.boxCounts);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-2 text-xs font-semibold text-body hover:text-ink transition-colors"
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
          <StatCard emoji="🔥" title="Racha" barClass="bg-accent" tintClass="bg-accent/10">
            <p className="text-2xl font-display font-black text-ink">
              {stats.streak} <span className="text-sm font-bold text-body">{stats.streak === 1 ? "día" : "días"}</span>
            </p>
            <p className="text-xs text-body mt-1">
              Hoy: {stats.todayReviewed} {stats.todayReviewed === 1 ? "repasada" : "repasadas"} · {stats.todayCorrect} ✓
            </p>
          </StatCard>

          <StatCard emoji="🗂️" title="Cajas Leitner" barClass="bg-primary" tintClass="bg-primary/10">
            <div className="space-y-1 relative">
              {Array.from({ length: MAX_BOX + 1 }, (_, box) => (
                <div key={box} className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 text-body">{BOX_LABELS[box]}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${box === MAX_BOX ? "bg-mastered" : box === 0 ? "bg-primary/60" : "bg-review"}`}
                      style={{ width: `${(stats.boxCounts[box] / maxBox) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right font-semibold text-ink">{stats.boxCounts[box]}</span>
                </div>
              ))}
            </div>
          </StatCard>

          <StatCard emoji="📅" title="Próximos repasos" barClass="bg-mastered" tintClass="bg-mastered/10">
            <p className="text-body">
              Mañana: <span className="font-semibold text-ink">{stats.dueTomorrow}</span>
            </p>
            <p className="text-body">
              Próximos 7 días: <span className="font-semibold text-ink">{stats.dueWeek}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">{state.totalCount} palabras en total</p>
          </StatCard>
        </div>
      )}
    </div>
  );
};
