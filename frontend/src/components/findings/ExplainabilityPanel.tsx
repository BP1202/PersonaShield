import React, { useState, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  Shield,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ArrowDown,
  Info,
} from "lucide-react";
import type { EvidenceCardData } from "../../types/api";

interface ExplainabilityPanelProps {
  findings: EvidenceCardData[];
  chains?: any[];
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({
  findings = [],
}) => {
  // Collapsed by default so website is not too long; user chooses to read
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const panelRef = useRef<HTMLDivElement>(null);

  if (!findings || findings.length === 0) {
    return null;
  }

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev.toUpperCase()) {
      case "CRITICAL":
        return "bg-red-950/80 text-red-400 border-red-500/40";
      case "HIGH":
        return "bg-amber-950/80 text-amber-400 border-amber-500/40";
      case "MEDIUM":
        return "bg-teal-950/80 text-teal-400 border-teal-500/40";
      case "LOW":
        return "bg-blue-950/80 text-blue-400 border-blue-500/40";
      default:
        return "bg-emerald-950/80 text-emerald-400 border-emerald-500/40";
    }
  };

  const formatFindingTitle = (type: string) => {
    const upper = type.toUpperCase().replace(/_/g, " ");
    if (upper.includes("AWS")) return "AWS ACCESS KEY EXPOSURE";
    if (upper.includes("AADHAAR")) return "AADHAAR EXPOSURE";
    if (upper.includes("PAN")) return "PAN EXPOSURE";
    if (upper.includes("COMBINED") || upper.includes("COMPOSITE"))
      return "COMBINED IDENTITY RISK";
    if (upper.includes("PHONE")) return "PHONE EXPOSURE";
    if (upper.includes("EMAIL")) return "EMAIL EXPOSURE";
    if (upper.endsWith("EXPOSURE") || upper.endsWith("RISK")) return upper;
    return `${upper} EXPOSURE`;
  };

  const getCleanExplanation = (finding: EvidenceCardData) => {
    const type = finding.finding_type?.toUpperCase() || "";

    if (type.includes("AWS") || type.includes("KEY") || type.includes("SECRET")) {
      return {
        whyItMatters: "This key can give access to cloud resources if active.",
        protectedBy:
          "Masking the full key in the protected copy with solid blackout.",
        whatYouShouldDo:
          "Rotate this key inside your cloud console before sharing screenshots publicly.",
      };
    }
    if (type.includes("AADHAAR")) {
      return {
        whyItMatters:
          "Someone could misuse this identity number if shared publicly.",
        protectedBy:
          "Applying standard partial masking (XXXX-XXXX-6012) and obscuring with blur.",
        whatYouShouldDo:
          "Always share the masked version instead of full 12-digit cards.",
      };
    }
    if (type.includes("PAN")) {
      return {
        whyItMatters: "Protect your tax identity before sharing documents.",
        protectedBy:
          "Masking central characters (ABCDE****F) and pixelating the region.",
        whatYouShouldDo:
          "Share only the sanitized copy where the central characters are covered.",
      };
    }
    if (type.includes("COMBINED") || type.includes("COMPOSITE")) {
      return {
        whyItMatters:
          "Multiple co-occurring identity artifacts allow cross-referencing and unauthorized identity profiling.",
        protectedBy:
          "Sanitizing cross-identifiable anchors simultaneously across the document.",
        whatYouShouldDo:
          "Avoid pairing contact numbers or names with ID numbers in public uploads.",
      };
    }
    if (type.includes("PHONE")) {
      return {
        whyItMatters: "Can be targeted for phishing calls or spam messages.",
        protectedBy: "Masking middle digits (+91 ***** *3210) with privacy blur.",
        whatYouShouldDo:
          "Keep your personal phone number masked when uploading documents to public groups.",
      };
    }
    if (type.includes("EMAIL")) {
      return {
        whyItMatters: "Exposed emails can receive targeted phishing campaigns or credential stuffing.",
        protectedBy: "Masking username prefix with privacy blur.",
        whatYouShouldDo:
          "Ensure work or personal emails are obscured in public captures.",
      };
    }

    return {
      whyItMatters:
        "Private digital information was found that should not be shared openly without precaution.",
      protectedBy: "Covered by the PersonaShield SafeShare privacy layer.",
      whatYouShouldDo:
        "Verify the protected preview before sharing with outside recipients.",
    };
  };

  return (
    <div
      ref={panelRef}
      className="w-full bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#1F2937] shadow-xl space-y-6 transition-all duration-300"
    >
      {/* Header & Toggle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#090B14] border border-[#1F2937] text-[#8B5CF6] shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Why This Matters
              </h3>
              <span className="text-xs font-semibold text-[#22C55E] px-2.5 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30">
                {findings.length} findings protected
              </span>
            </div>
            <p className="text-xs text-[#8CA3B8] mt-0.5">
              Understand what was found, how it was protected, and what you should do next.
            </p>
          </div>
        </div>

        {/* User Choice Toggle Button with Arrow Down / Up */}
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#090B14] hover:bg-[#162032] border border-[#1F2937] hover:border-[#8B5CF6]/50 text-white text-xs font-bold transition-all cursor-pointer shadow-md self-start sm:self-auto shrink-0 group"
        >
          <span>{isOpen ? "Collapse Details" : "Read Details"}</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-[#8B5CF6]" />
          ) : (
            <ArrowDown className="w-4 h-4 text-[#8B5CF6] animate-bounce" />
          )}
        </button>
      </div>

      {/* Expanded Accordion Content */}
      {isOpen && (
        <div className="space-y-4 pt-2 border-t border-[#1F2937]">
          {/* Helpful subtitle with down arrow indicator to scroll if multiple items */}
          <div className="flex items-center justify-between text-xs text-[#8CA3B8] pb-1">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#8B5CF6]" />
              Click any item to inspect its security impact and remediation:
            </span>
            {findings.length > 3 && (
              <span className="flex items-center gap-1 text-[#8B5CF6] font-medium hidden sm:inline-flex">
                <span>Scroll down for all findings</span>
                <ArrowDown className="w-3 h-3 animate-pulse" />
              </span>
            )}
          </div>

          {/* Findings List with Max Height Scrollable Box to keep website compact */}
          <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
            {findings.map((f, idx) => {
              const isExpanded = expandedIdx === idx;
              const info = getCleanExplanation(f);
              const badgeClass = getSeverityBadge(f.severity);
              const displayTitle = formatFindingTitle(f.finding_type);

              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#090B14] border border-[#1F2937] hover:border-[#8B5CF6]/40 overflow-hidden transition-all duration-200"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-[#162032]/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0 ${badgeClass}`}
                      >
                        {f.severity}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-white truncate">
                        {displayTitle}
                      </span>
                      <span className="text-xs font-mono text-[#8CA3B8] hidden sm:inline truncate max-w-[220px]">
                        {f.masked_value}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[#8CA3B8] shrink-0">
                      <span className="text-xs hidden md:inline">
                        {isExpanded ? "Collapse" : "Details"}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-[#1F2937]/50 space-y-4 text-xs bg-[#0c0f1c]">
                      {/* Why this matters */}
                      <div className="space-y-1">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                          <span>Why this matters</span>
                        </div>
                        <p className="text-[#8CA3B8] pl-5 leading-relaxed">
                          {info.whyItMatters}
                        </p>
                      </div>

                      {/* PersonaShield protected it by */}
                      <div className="space-y-1">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                          <span>PersonaShield protected it by</span>
                        </div>
                        <p className="text-[#8CA3B8] pl-5 leading-relaxed">
                          {info.protectedBy}
                        </p>
                      </div>

                      {/* What you should do */}
                      <div className="space-y-1">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5 text-[#8B5CF6]" />
                          <span>What you should do</span>
                        </div>
                        <p className="text-[#8CA3B8] pl-5 leading-relaxed">
                          {info.whatYouShouldDo}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom collapse helper */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleToggle}
              className="inline-flex items-center gap-1.5 text-xs text-[#8CA3B8] hover:text-white transition-colors cursor-pointer"
            >
              <span>Collapse section</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
