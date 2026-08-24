import type { FilterStatus } from "../types/vocabulary";

interface FilterTabsProps {
  filter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
}

export const FilterTabs = ({ filter, onFilterChange }: FilterTabsProps) => {
  const tabs: { key: FilterStatus; emoji: string; label: string; active: string }[] = [
    { key: "all", emoji: "📚", label: "Todas", active: "bg-primary text-white shadow-sm" },
    { key: "learned", emoji: "✅", label: "Dominadas", active: "bg-mastered text-white shadow-sm" },
    { key: "pending", emoji: "🕑", label: "Por aprender", active: "bg-review text-white shadow-sm" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onFilterChange(tab.key)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
            filter === tab.key
              ? `${tab.active} border-transparent`
              : "bg-white text-body border-slate-200 hover:border-slate-300 hover:bg-wash"
          }`}
        >
          <span aria-hidden="true">{tab.emoji}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
};
