import { useVocabularyStorage } from "../hooks/vocabularyContext";

export const ProgressBar = () => {
  const { state } = useVocabularyStorage();

  const pct = (n: number) => (state.totalCount > 0 ? (n / state.totalCount) * 100 : 0);
  const newCount = state.totalCount - state.learnedCount - state.inProgressCount;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-slate-500">Progreso de aprendizaje</span>
        <span className="text-slate-500">
          <span className="font-semibold text-slate-900">{state.learnedCount}</span> dominadas
          {" · "}
          <span className="font-semibold text-amber-600">{state.inProgressCount}</span> en repaso
          {" · "}
          <span className="font-semibold text-slate-700">{newCount}</span> nuevas
        </span>
      </div>
      <div className="w-full rounded-full h-2.5 bg-slate-200 overflow-hidden flex">
        <div
          className="h-full transition-all duration-500 ease-out bg-[#751200]"
          style={{ width: `${pct(state.learnedCount)}%` }}
        />
        <div
          className="h-full transition-all duration-500 ease-out bg-amber-400"
          style={{ width: `${pct(state.inProgressCount)}%` }}
        />
      </div>
    </div>
  );
};
