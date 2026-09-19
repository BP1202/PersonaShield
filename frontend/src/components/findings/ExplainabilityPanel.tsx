import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  Target,
  CheckCircle2,
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
        return "bg-red-950/60 text-red-400 border-red-500/40";
      case "HIGH":
        return "bg-orange-950/60 text-orange-400 border-orange-500/40";
      case "MEDIUM":
        return "bg-amber-950/60 text-amber-400 border-amber-500/40";
      default:
        return "bg-emerald-950/60 text-emerald-400 border-emerald-500/40";
    }
  };

  const getExplainabilityReason = (finding: EvidenceCardData) => {
    const type = finding.finding_type?.toUpperCase() || "";
    if (type.includes("AWS") || type.includes("KEY")) {
      return {
        detectionMethod: "Regex Pattern + Shannon High-Entropy Validator",
        exploitRisk: "Exposed cloud credentials allow unauthorized API invocation, full cloud infrastructure compromise, and data exfiltration.",
        remediation: "Immediately rotate the IAM access key in AWS Console and revoke active sessions.",
      };
    }
    if (type.includes("AADHAAR")) {
      return {
        detectionMethod: "12-Digit Verhoeff-Compliant Aadhaar Pattern Engine",
        exploitRisk: "National identity numbers can be exploited for SIM-swap fraud, unauthorized KYC verification, and financial identity theft.",
        remediation: "Mask first 8 digits or redact the entire Aadhaar number before publishing.",
      };
    }
    if (type.includes("PAN")) {
      return {
        detectionMethod: "10-Character Alphanumeric Tax Identifier Regex Pattern",
        exploitRisk: "Tax identity exposure enables credit card fraud and illicit financial account queries.",
        remediation: "Apply blackout redaction over central alphanumeric sequences.",
      };
    }
    if (type.includes("PHONE")) {
      return {
        detectionMethod: "E.164 International Phone Regex Matcher",
        exploitRisk: "Direct contact leaks facilitate targeted phishing (smishing) and social engineering campaigns.",
        remediation: "Mask phone number digits leaving only area code or redact completely.",
      };
    }
    if (type.includes("EMAIL")) {
      return {
        detectionMethod: "RFC-5322 Standardized Email Address Lexer",
        exploitRisk: "Personal and enterprise emails are harvested by automated credential stuffing bots.",
        remediation: "Mask username or domain before external sharing.",
      };
    }
    return {
      detectionMethod: "Deterministic OCR Text Extraction + NLP Classifier",
      exploitRisk: "Confidential text identified on digital canvas could lead to accidental intelligence leakage.",
      remediation: "Review highlighted region and apply SafeShare privacy mask.",
    };
  };

  return (
    <div className="w-full bg-[#0F172A] rounded-3xl p-6 sm:p-8 border border-[#1E293B] shadow-2xl space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#060816] border border-[#1E293B] text-[#7C3AED]">
            <Cpu className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>AI Findings & Reasoning Playbook</span>
              <span className="px-2 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/40 text-[10px] font-bold">
                Explainable AI
              </span>
            </h3>
            <p className="text-xs text-[#8CA3B8]">
              Deterministic explanations detailing detection methodology, exploit risk vectors, and remediation steps
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-[#10B981] px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/30">
          {findings.length} findings evaluated
        </span>
      </div>

      <div className="space-y-3">
        {findings.map((f, idx) => {
          const isExpanded = expandedIdx === idx;
          const meta = getExplainabilityReason(f);
          const badgeClass = getSeverityBadge(f.severity);

          return (
            <div
              key={idx}
              className="rounded-2xl bg-[#060816] border border-[#1E293B] overflow-hidden transition-all duration-200"
            >
              {/* Card Header Row */}
              <button
                type="button"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-[#162032]/40 transition-colors cursor-pointer"
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
                  <span className="text-[11px] text-[#10B981] font-mono hidden md:inline">
                    {Math.round(f.confidence * 100)}% Confidence
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
                <div className="p-4 pt-2 border-t border-[#1E293B] space-y-3.5 bg-[#0F172A]/40 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Detection Method */}
                    <div className="p-3 rounded-xl bg-[#060816] border border-[#1E293B]">
                      <div className="flex items-center gap-1.5 text-[#7C3AED] font-semibold mb-1">
                        <Cpu className="w-3.5 h-3.5" />
                        <span>Detection Methodology</span>
                      </div>
                      <p className="text-[#8CA3B8] leading-relaxed">{meta.detectionMethod}</p>
                    </div>

                    {/* Exploit Vector */}
                    <div className="p-3 rounded-xl bg-[#060816] border border-[#1E293B]">
                      <div className="flex items-center gap-1.5 text-[#F59E0B] font-semibold mb-1">
                        <Target className="w-3.5 h-3.5" />
                        <span>Cybersecurity Threat Impact</span>
                      </div>
                      <p className="text-[#8CA3B8] leading-relaxed">{meta.exploitRisk}</p>
                    </div>
                  </div>

                  {/* Recommendation Playbook */}
                  <div className="p-3 rounded-xl bg-[#060816] border border-[#10B981]/30 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-white">Recommended Action: </span>
                      <span className="text-[#8CA3B8]">{meta.remediation}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Global Metadata Strip Guarantee */}
        <div className="p-4 rounded-2xl bg-[#060816] border border-[#10B981]/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-white">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span className="font-semibold">Hardware Metadata & EXIF Stripping:</span>
            <span className="text-[#8CA3B8]">
              GPS coordinates, device camera serials, and timestamps automatically purged.
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#10B981] bg-[#10B981]/15 px-2.5 py-0.5 rounded-full border border-[#10B981]/30">
            Guaranteed
          </span>
        </div>
      </div>
    </div>
  );
};
