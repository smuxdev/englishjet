import { useVocabularyStorage } from "../hooks/vocabularyContext";

export const ProgressBar = () => {
  const { state } = useVocabularyStorage();

  const pct = (n: number) => (state.totalCount > 0 ? (n / state.totalCount) * 100 : 0);
  const newCount = state.totalCount - state.learnedCount - state.inProgressCount;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 text-sm mb-1.5">
        <span className="text-body">Progreso de aprendizaje</span>
        <span className="text-body whitespace-nowrap">
          <span className="font-semibold text-mastered">{state.learnedCount}</span> dominadas
          {" · "}
          <span className="font-semibold text-review">{state.inProgressCount}</span> en repaso
          {" · "}
          <span className="font-semibold text-ink">{newCount}</span> nuevas
        </span>
      </div>
      <div className="w-full rounded-full h-2.5 bg-slate-200 overflow-hidden flex">
        <div
          className="h-full transition-all duration-500 ease-out bg-mastered"
          style={{ width: `${pct(state.learnedCount)}%` }}
        />
        <div
          className="h-full transition-all duration-500 ease-out bg-review"
          style={{ width: `${pct(state.inProgressCount)}%` }}
        />
      </div>
    </div>
  );
};
