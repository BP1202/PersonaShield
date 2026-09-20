import React, { useState } from "react";
import { ChevronDown, ChevronUp, ShieldAlert, Sparkles, CheckCircle, ShieldCheck } from "lucide-react";
import { Badge } from "../common/Badge";
import type { EvidenceCardData } from "../../types/api";

interface FindingCardProps {
  finding: EvidenceCardData | any;
}

export const FindingCard: React.FC<FindingCardProps> = ({ finding }) => {
  const [expanded, setExpanded] = useState(false);

  const getSeverityVariant = (sev: string) => {
    switch (sev?.toUpperCase()) {
      case "CRITICAL":
        return "critical" as const;
      case "HIGH":
        return "high" as const;
      case "MEDIUM":
        return "medium" as const;
      default:
        return "low" as const;
    }
  };

  const maskedSnippet = finding.masked_value || finding.masked_evidence || "";
  const recommendationText =
    typeof finding.recommendation === "string"
      ? finding.recommendation
      : (finding.recommendation?.impact_summary || finding.recommendation?.title || "");
  const playbookSteps: string[] =
    finding.recommendation?.action_steps || finding.remediation_playbook?.steps || [];
  const playbookAction: string =
    finding.recommendation?.title || finding.remediation_playbook?.action || "";

  return (
    <div className="rounded-2xl bg-[#121A2E] border border-[#1E293B] hover:border-[#334155] transition-all overflow-hidden shadow-lg">
      {/* Header bar / Clickable summary */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <Badge variant={getSeverityVariant(finding.severity)}>
            {finding.severity}
          </Badge>

          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-white truncate">
                {finding.finding_type}
              </span>
              {finding.attack_surface && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B1020] text-[#94A3B8] border border-[#1E293B]">
                  {finding.attack_surface}
                </span>
              )}
            </div>
            <div className="text-xs font-mono text-[#14B8A6] mt-0.5 truncate">
              {maskedSnippet}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-xs font-mono text-[#64748B]">
            Conf: {((finding.confidence || 0) * 100).toFixed(0)}%
          </span>
          <div className="p-1.5 rounded-lg bg-[#0B1020] border border-[#1E293B] text-[#94A3B8]">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="p-4 sm:p-5 border-t border-[#1E293B] bg-[#0B1020]/40 space-y-4 text-xs">
          {/* Evidence snippet */}
          <div>
            <div className="font-semibold text-[#94A3B8] mb-1.5 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#A855F7]" />
              <span>Masked Evidence Snippet</span>
            </div>
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#1E293B] font-mono text-[#14B8A6] text-xs">
              {maskedSnippet}
            </div>
          </div>

          {/* Explainable Confidence Reasons */}
          {finding.confidence_reasons && finding.confidence_reasons.length > 0 && (
            <div>
              <div className="font-semibold text-[#94A3B8] mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#14B8A6]" />
                <span>Explainable Confidence Reasons</span>
              </div>
              <ul className="space-y-1 pl-1">
                {finding.confidence_reasons.map((reason: string, idx: number) => (
                  <li key={idx} className="text-[#E5E7EB] flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] mt-1.5 shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendation & Playbook */}
          <div>
            <div className="font-semibold text-[#94A3B8] mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Remediation Recommendation</span>
            </div>
            {recommendationText && (
              <p className="text-[#E5E7EB] leading-relaxed mb-2">{recommendationText}</p>
            )}

            {playbookSteps.length > 0 && (
              <div className="p-3 rounded-xl bg-[#121A2E] border border-[#1E293B] space-y-1">
                {playbookAction && (
                  <div className="font-semibold text-[11px] text-[#A855F7] mb-1">
                    Action: {playbookAction}
                  </div>
                )}
                {playbookSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[#94A3B8] text-[11px]">
                    <CheckCircle className="w-3 h-3 text-[#14B8A6] mt-0.5 shrink-0" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
