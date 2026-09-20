import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import type { EvidenceCardData } from "../../types/api";

interface ExplainabilityPanelProps {
  findings: EvidenceCardData[];
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({ findings }) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  if (!findings || findings.length === 0) {
    return null;
  }

  const getSeverityBadge = (sev: string) => {
    switch (sev.toUpperCase()) {
      case "CRITICAL":
        return "bg-red-950/80 text-red-400 border-red-500/40";
      case "HIGH":
        return "bg-amber-950/80 text-amber-400 border-amber-500/40";
      case "MEDIUM":
        return "bg-teal-950/80 text-teal-400 border-teal-500/40";
      default:
        return "bg-emerald-950/80 text-emerald-400 border-emerald-500/40";
    }
  };

  const getHumanExplanation = (finding: EvidenceCardData) => {
    const type = finding.finding_type?.toUpperCase() || "";
    if (type.includes("AWS") || type.includes("KEY") || type.includes("SECRET")) {
      return {
        whyItMatters: "Anyone who gets this document can use this key to access your cloud resources, read private databases, or run expensive compute on your bill.",
        whatWeProtected: "The entire API secret is masked and rendered with Gaussian blur on the safe copy.",
        whatYouShouldDo: "Rotate or deactivate this key in your cloud provider console before sharing any screenshot.",
      };
    }
    if (type.includes("AADHAAR")) {
      return {
        whyItMatters: "Your 12-digit Aadhaar number is used for identity verification across banks, telecom providers, and government services. Leaking it exposes you to financial fraud or fraudulent SIM card registrations.",
        whatWeProtected: "All 12 digits are masked with compliant partial masking (XXXX-XXXX-XXXX) and blurred.",
        whatYouShouldDo: "Only share the protected copy, or download a masked e-Aadhaar from the official portal.",
      };
    }
    if (type.includes("PAN")) {
      return {
        whyItMatters: "Your PAN card is your permanent tax identity. Fraudsters can use it to track financial history, file fraudulent tax refunds, or attempt credit checks.",
        whatWeProtected: "Central alphanumeric characters are completely masked and pixelated.",
        whatYouShouldDo: "Share only the redacted version where the core tax ID numbers are permanently covered.",
      };
    }
    if (type.includes("PHONE")) {
      return {
        whyItMatters: "Exposing personal phone numbers on documents or social media makes you an easy target for targeted SMS phishing (smishing) and robocalls.",
        whatWeProtected: "Phone number digits are shielded with privacy blackout or blur.",
        whatYouShouldDo: "Keep your direct personal number private and use masked copies for public forms.",
      };
    }
    if (type.includes("EMAIL")) {
      return {
        whyItMatters: "Publicly visible email addresses get scraped by bots and targeted for phishing campaigns and credential stuffing attacks.",
        whatWeProtected: "Email username and domain are shielded from automated screen scrapers.",
        whatYouShouldDo: "Verify your email provider has 2-factor authentication enabled.",
      };
    }
    return {
      whyItMatters: "Confidential private data was identified that shouldn't be shared openly without precaution.",
      whatWeProtected: "The detected region has been placed into the SafeShare protection layer.",
      whatYouShouldDo: "Review the protected copy to ensure all private information is properly hidden.",
    };
  };

  return (
    <div className="w-full bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#1F2937] shadow-2xl space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#1F2937]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#090B14] border border-[#1F2937] text-[#8B5CF6]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Privacy Findings: Why This Matters</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40 text-[10px] font-bold">
                Plain English Guide
              </span>
            </h3>
            <p className="text-xs text-[#8CA3B8]">
              Simple explanations of what was found, why it poses a risk, and how PersonaShield protected you.
            </p>
          </div>
        </div>

        <span className="text-xs font-medium text-[#14B8A6] px-3 py-1 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/30">
          {findings.length} findings protected
        </span>
      </div>

      <div className="space-y-3">
        {findings.map((f, idx) => {
          const isExpanded = expandedIdx === idx;
          const explanation = getHumanExplanation(f);
          const badgeClass = getSeverityBadge(f.severity);

          return (
            <div
              key={idx}
              className="rounded-2xl bg-[#090B14] border border-[#1F2937] overflow-hidden transition-all duration-200"
            >
              {/* Card Header Row */}
              <button
                type="button"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-[#162032]/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeClass}`}
                  >
                    {f.severity}
                  </span>
                  <span className="font-bold text-sm text-white truncate">
                    {f.finding_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs font-mono text-[#8CA3B8] hidden sm:inline truncate max-w-[200px]">
                    {f.masked_value}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#14B8A6] font-medium hidden md:inline">
                    {Math.round(f.confidence * 100)}% Match
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#8CA3B8]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#8CA3B8]" />
                  )}
                </div>
              </button>

              {/* Expanded Explanations Drawer */}
              {isExpanded && (
                <div className="p-4 pt-2 border-t border-[#1F2937] space-y-3 bg-[#111827]/40 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Why this matters */}
                    <div className="p-3.5 rounded-xl bg-[#090B14] border border-[#1F2937]">
                      <div className="flex items-center gap-1.5 text-[#F59E0B] font-semibold mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Why This Matters</span>
                      </div>
                      <p className="text-[#8CA3B8] leading-relaxed">
                        {explanation.whyItMatters}
                      </p>
                    </div>

                    {/* What PersonaShield protected */}
                    <div className="p-3.5 rounded-xl bg-[#090B14] border border-[#1F2937]">
                      <div className="flex items-center gap-1.5 text-[#8B5CF6] font-semibold mb-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>What PersonaShield Protected</span>
                      </div>
                      <p className="text-[#8CA3B8] leading-relaxed">
                        {explanation.whatWeProtected}
                      </p>
                    </div>
                  </div>

                  {/* Recommendation Playbook */}
                  <div className="p-3.5 rounded-xl bg-[#090B14] border border-[#22C55E]/30 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-white">What You Should Do Next: </span>
                      <span className="text-[#8CA3B8]">{explanation.whatYouShouldDo}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Global Metadata Strip Guarantee */}
        <div className="p-4 rounded-2xl bg-[#090B14] border border-[#14B8A6]/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-white">
            <CheckCircle2 className="w-4 h-4 text-[#14B8A6]" />
            <span className="font-semibold">Photo Location & Device Info:</span>
            <span className="text-[#8CA3B8]">
              Camera GPS coordinates and model details automatically stripped from the file before download.
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#14B8A6] bg-[#14B8A6]/15 px-2.5 py-0.5 rounded-full border border-[#14B8A6]/30">
            Erased
          </span>
        </div>
      </div>
    </div>
  );
};
