import React from "react";
import { ShieldAlert, ShieldCheck, AlertOctagon, CheckCircle2, Shield } from "lucide-react";
import { Badge } from "../common/Badge";
import type { CyberSafetyReceipt } from "../../types/api";

interface ExposureScoreCardProps {
  receipt: CyberSafetyReceipt;
}

export const ExposureScoreCard: React.FC<ExposureScoreCardProps> = ({ receipt }) => {
  const { exposure_score, risk_level, total_findings, critical_count, high_count, safeshare_available } =
    receipt;

  const getRiskDetails = () => {
    switch (risk_level) {
      case "CRITICAL":
        return {
          color: "#EF4444",
          badgeVariant: "critical" as const,
          desc: "Severe exposure detected. Credentials or high-risk identifiers are immediately exploitable.",
          icon: AlertOctagon,
        };
      case "HIGH":
        return {
          color: "#F97316",
          badgeVariant: "high" as const,
          desc: "Significant risk identified. Secrets or identity documents should not be shared publicly.",
          icon: ShieldAlert,
        };
      case "MEDIUM":
        return {
          color: "#F59E0B",
          badgeVariant: "medium" as const,
          desc: "Moderate exposure detected. PII or contact details are exposed.",
          icon: ShieldAlert,
        };
      case "LOW":
        return {
          color: "#60A5FA",
          badgeVariant: "low" as const,
          desc: "Low-risk digital footprint found. Review before sharing.",
          icon: Shield,
        };
      default:
        return {
          color: "#22C55E",
          badgeVariant: "success" as const,
          desc: "No sensitive digital leaks or exposed credentials detected. Clean artifact.",
          icon: ShieldCheck,
        };
    }
  };

  const details = getRiskDetails();
  const IconComponent = details.icon;

  return (
    <div className="w-full bg-[#121A2E] rounded-3xl p-6 sm:p-8 border border-[#1E293B] shadow-2xl relative overflow-hidden">
      {/* Background accent glow */}
      <div
        className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ backgroundColor: details.color }}
      />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left Side: Score & Tier */}
        <div className="flex items-center gap-6">
          <div
            className="w-28 h-28 rounded-2xl bg-[#0B1020] border flex flex-col items-center justify-center shrink-0 shadow-xl"
            style={{ borderColor: `${details.color}50` }}
          >
            <span
              className="text-4xl font-extrabold tracking-tight"
              style={{ color: details.color }}
            >
              {exposure_score}
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#94A3B8]">
              / 100
            </span>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant={details.badgeVariant} className="text-xs px-3 py-1">
                <IconComponent className="w-3.5 h-3.5 mr-1" />
                {risk_level} RISK
              </Badge>
              {safeshare_available && (
                <span className="text-xs font-semibold text-[#14B8A6] flex items-center gap-1 bg-[#14B8A6]/10 px-2.5 py-1 rounded-full border border-[#14B8A6]/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  SafeShare Ready
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-white mb-1">Cyber Safety Receipt</h2>
            <p className="text-xs text-[#94A3B8] max-w-lg leading-relaxed">{details.desc}</p>
          </div>
        </div>

        {/* Right Side: Finding Counts Breakdown */}
        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
          <div className="p-3.5 rounded-2xl bg-[#0B1020] border border-[#1E293B] text-center min-w-[90px]">
            <div className="text-xl font-bold text-white">{total_findings}</div>
            <div className="text-[11px] text-[#94A3B8] font-medium">Total Leaks</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#0B1020] border border-[#1E293B] text-center min-w-[90px]">
            <div className="text-xl font-bold text-[#EF4444]">{critical_count}</div>
            <div className="text-[11px] text-[#94A3B8] font-medium">Critical</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#0B1020] border border-[#1E293B] text-center min-w-[90px]">
            <div className="text-xl font-bold text-[#F97316]">{high_count}</div>
            <div className="text-[11px] text-[#94A3B8] font-medium">High Risk</div>
          </div>
        </div>
      </div>
    </div>
  );
};
