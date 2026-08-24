import type { FilterStatus } from "../types/vocabulary";

interface FilterTabsProps {
  filter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
}

export const FilterTabs = ({ filter, onFilterChange }: FilterTabsProps) => {
  const tabs: { key: FilterStatus; label: string; color: string }[] = [
    { key: "all", label: "Todas", color: "bg-[#751200] text-white shadow-sm" },
    { key: "learned", label: "Aprendidas", color: "bg-emerald-500 text-white shadow-sm" },
    { key: "pending", label: "Por aprender", color: "bg-amber-400 text-amber-900 shadow-sm" },
  ];

  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onFilterChange(tab.key)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
            filter === tab.key
              ? tab.color
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
