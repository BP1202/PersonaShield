import React from "react";

export type BadgeVariant = "default" | "critical" | "high" | "medium" | "low" | "success" | "accent" | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "default", className = "" }) => {
  const variantStyles: Record<BadgeVariant, string> = {
    default: "bg-[#1E293B] text-[#E5E7EB] border-[#334155]",
    critical: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30 font-semibold",
    high: "bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30 font-semibold",
    medium: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
    low: "bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30",
    success: "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
    accent: "bg-[#14B8A6]/15 text-[#14B8A6] border-[#14B8A6]/30",
    outline: "bg-transparent text-[#94A3B8] border-[#334155]",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
