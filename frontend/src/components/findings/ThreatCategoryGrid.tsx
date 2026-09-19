import React from "react";
import { KeyRound, UserCheck, CreditCard, Building2, EyeOff } from "lucide-react";

interface ThreatCategoryGridProps {
  categories?: Record<string, number> | string[];
}

export const ThreatCategoryGrid: React.FC<ThreatCategoryGridProps> = ({ categories = {} }) => {
  const getCategoryMeta = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "developer_secrets":
      case "developer":
        return { label: "Developer Secrets", icon: KeyRound, color: "#A855F7" };
      case "national_identity":
      case "identity":
        return { label: "National Identity", icon: UserCheck, color: "#14B8A6" };
      case "financial":
      case "payment":
        return { label: "Financial Data", icon: CreditCard, color: "#F59E0B" };
      case "workplace":
      case "workplace_security":
      case "workplace & infra":
        return { label: "Workplace & Infra", icon: Building2, color: "#60A5FA" };
      default:
        return { label: "Personal Privacy", icon: EyeOff, color: "#EC4899" };
    }
  };

  const normalizedCategories: Record<string, number> = Array.isArray(categories)
    ? categories.reduce((acc, cat) => {
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : (categories as Record<string, number>) || {};

  const entries = Object.entries(normalizedCategories);

  if (entries.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-[#121A2E] border border-[#1E293B] text-center text-xs text-[#94A3B8]">
        No active threat categories flagged for this artifact.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {entries.map(([category, count]) => {
        const meta = getCategoryMeta(category);
        const Icon = meta.icon;

        return (
          <div
            key={category}
            className="p-4 rounded-2xl bg-[#121A2E] border border-[#1E293B] flex flex-col justify-between hover:border-[#334155] transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="p-2 rounded-xl bg-[#0B1020] border border-[#1E293B]"
                style={{ color: meta.color }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-white px-2 py-0.5 rounded-md bg-[#0B1020] border border-[#1E293B]">
                {count}
              </span>
            </div>
            <div>
              <div className="font-semibold text-xs text-white truncate">{meta.label}</div>
              <div className="text-[11px] text-[#94A3B8] capitalize mt-0.5">
                {count === 1 ? "1 exposure" : `${count} exposures`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
