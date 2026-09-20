import React, { useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Key,
  CreditCard,
  Phone,
  FileText,
  ArrowRight,
  Download,
  Clock,
  Globe,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Landmark,
  Building2,
  QrCode,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { CyberSafetyReceipt, EvidenceCardData } from "../../types/api";

interface CyberSafetyReceiptCardProps {
  receipt: CyberSafetyReceipt;
  evidenceCards?: EvidenceCardData[];
  scanId?: string;
  onDownloadClean?: () => void;
}

/** Converts a FINDING_TYPE_SNAKE_CASE into a readable label. */
function humanizeFindingType(findingType: string): string {
  return findingType
    .replace(/_/g, " ")
    .replace(/EXPOSURE$/i, "")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Maps receipt.risk_level to human-readable label + color token. */
function getRiskDisplay(riskLevel: string): { label: string; color: string; borderColor: string; bgColor: string; icon: typeof ShieldAlert } {
  const level = (riskLevel || "SAFE").toUpperCase();
  if (level === "CRITICAL") return { label: "Critical Privacy Risk", color: "text-[#EF4444]", borderColor: "border-red-500/30", bgColor: "bg-red-950/80", icon: ShieldAlert };
  if (level === "HIGH") return { label: "High Privacy Risk", color: "text-[#EF4444]", borderColor: "border-red-500/30", bgColor: "bg-red-950/80", icon: ShieldAlert };
  if (level === "MEDIUM") return { label: "Moderate Risk", color: "text-amber-400", borderColor: "border-amber-500/30", bgColor: "bg-amber-950/80", icon: AlertTriangle };
  if (level === "LOW") return { label: "Low Risk", color: "text-teal-400", borderColor: "border-teal-500/30", bgColor: "bg-teal-950/80", icon: AlertTriangle };
  return { label: "Safe to Share", color: "text-[#22C55E]", borderColor: "border-[#22C55E]/30", bgColor: "bg-[#22C55E]/15", icon: ShieldCheck };
}

/** Returns the dominant threat categories present in findings as a summary string. */
function getCategorySummary(evidenceCards: EvidenceCardData[]): string {
  const cats = new Set<string>();
  for (const c of evidenceCards) {
    const cat = (c.category || "").toUpperCase();
    if (cat === "CREDENTIAL") cats.add("Developer");
    else if (cat === "IDENTITY") cats.add("Identity");
    else if (cat === "FINANCIAL") cats.add("Financial");
    else if (cat === "PRIVACY") cats.add("Contact");
    else if (cat === "WORKPLACE") cats.add("Workplace");
    else if (cat) cats.add(cat.charAt(0) + cat.slice(1).toLowerCase());
  }
  if (cats.size === 0) return "No threats detected";
  return Array.from(cats).join(" • ");
}

export const CyberSafetyReceiptCard: React.FC<CyberSafetyReceiptCardProps> = ({
  receipt,
  evidenceCards = [],
  scanId,
  onDownloadClean,
}) => {
  const findingsCount = receipt.total_findings ?? evidenceCards.length;

  const formattedDate = useMemo(() => {
    if (!receipt.generated_at) {
      return new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    try {
      const d = new Date(receipt.generated_at);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return receipt.generated_at;
    }
  }, [receipt.generated_at]);

  // Dynamic risk display from receipt.risk_level
  const risk = useMemo(() => getRiskDisplay(receipt.risk_level), [receipt.risk_level]);
  const categorySummary = useMemo(() => getCategorySummary(evidenceCards), [evidenceCards]);
  const isSafe = (receipt.risk_level || "").toUpperCase() === "SAFE" && findingsCount === 0;

  // Detected document type from actual findings
  const docType = useMemo(() => {
    if (evidenceCards.length === 0) return "Digital Document";
    const types = evidenceCards.map((c) => (c.finding_type || "").toUpperCase());
    if (types.some((t) => t.includes("AADHAAR"))) return "Identity Document (Aadhaar)";
    if (types.some((t) => t.includes("PAN"))) return "Tax ID Document (PAN Card)";
    if (types.some((t) => t.includes("PASSPORT"))) return "Identity Document (Passport)";
    if (types.some((t) => t.includes("AWS") || t.includes("GITHUB") || t.includes("TOKEN"))) return "Developer Screenshot / Cloud Credentials";
    if (types.some((t) => t.includes("CREDIT_CARD"))) return "Financial Document";
    if (types.some((t) => t.includes("UPI"))) return "Payment Receipt";
    if (types.some((t) => t.includes("SALARY") || t.includes("FINANCIAL"))) return "Financial Document";
    if (types.some((t) => t.includes("WORKPLACE"))) return "Corporate Document";
    return "Sensitive Digital Artifact";
  }, [evidenceCards]);

  // Build risk meter items from ACTUAL findings only — no fallbacks
  const riskMeterItems = useMemo(() => {
    return evidenceCards.map((c, idx) => {
      const type = (c.finding_type || "").toUpperCase();
      const maskedVal = c.masked_value || "Protected";

      // Specific finding types
      if (type.includes("AWS") || type.includes("KEY") || type.includes("SECRET") || type.includes("TOKEN")) {
        return {
          id: `finding-${idx}`,
          name: humanizeFindingType(c.finding_type),
          severity: (c.severity || "CRITICAL") as "CRITICAL" | "HIGH" | "MEDIUM" | "SAFE",
          impact: "This key can give access to cloud resources if active.",
          protectedStatus: "Hidden (Solid Blackout)",
          icon: Key,
        };
      }
      if (type.includes("AADHAAR")) {
        return {
          id: `finding-${idx}`,
          name: "Aadhaar Number Found",
          severity: (c.severity || "HIGH") as "CRITICAL" | "HIGH" | "MEDIUM" | "SAFE",
          impact: "Someone could misuse this identity number if shared publicly.",
          protectedStatus: `Masked (${maskedVal})`,
          icon: CreditCard,
        };
      }
      if (type.includes("PAN")) {
        return {
          id: `finding-${idx}`,
          name: "PAN Number Found",
          severity: (c.severity || "HIGH") as "CRITICAL" | "HIGH" | "MEDIUM" | "SAFE",
          impact: "Protect your tax identity before sharing documents.",
          protectedStatus: `Masked (${maskedVal})`,
          icon: FileText,
        };
      }
      if (type.includes("PHONE")) {
        return {
          id: `finding-${idx}`,
          name: "Phone Number Found",
          severity: (c.severity || "MEDIUM") as "CRITICAL" | "HIGH" | "MEDIUM" | "SAFE",
          impact: "Can be targeted for phishing calls or spam messages.",
          protectedStatus: `Masked (${maskedVal})`,
          icon: Phone,
        };
      }
      if (type.includes("EMAIL")) {
        return {
          id: `finding-${idx}`,
          name: "Email Address Found",
          severity: (c.severity || "MEDIUM") as "CRITICAL" | "HIGH" | "MEDIUM" | "SAFE",
          impact: "Can be targeted for phishing emails or spam lists.",
          protectedStatus: `Masked (${maskedVal})`,
          icon: Mail,
        };
      }
      if (type.includes("UPI")) {
        return {
          id: `finding-${idx}`,
          name: "UPI Payment ID Found",
          severity: (c.severity || "MEDIUM") as "CRITICAL" | "HIGH" | "MEDIUM" | "SAFE",
          impact: "Could be used for deceptive payment collect requests.",
          protectedStatus: `Masked (${maskedVal})`,
          icon: Landmark,
        };
      }
      if (type.includes("CREDIT_CARD")) {
        return {
          id: `finding-${idx}`,
          name: "Credit Card Number Found",
          severity: (c.severity || "CRITICAL") as "CRITICAL" | "HIGH" | "MEDIUM" | "SAFE",
          impact: "Facilitates card-not-present transactions and online purchase fraud.",
          protectedStatus: `Masked (${maskedVal})`,
          icon: CreditCard,
        };
      }
      if (type.includes("WORKPLACE") || type.includes("INTERNAL")) {
        return {
          id: `finding-${idx}`,
          name: "Internal Info Found",
          severity: (c.severity || "MEDIUM") as "CRITICAL" | "HIGH" | "MEDIUM" | "SAFE",
          impact: "Reveals internal network or corporate infrastructure details.",
          protectedStatus: `Masked (${maskedVal})`,
          icon: Building2,
        };
      }
      if (type.includes("QR")) {
        return {
          id: `finding-${idx}`,
          name: "QR Code Detected",
          severity: (c.severity || "MEDIUM") as "CRITICAL" | "HIGH" | "MEDIUM" | "SAFE",
          impact: "QR codes can embed payment links or login credentials.",
          protectedStatus: `Protected (${maskedVal})`,
          icon: QrCode,
        };
      }

      // Generic catch-all for any unrecognized finding type
      return {
        id: `finding-${idx}`,
        name: `${humanizeFindingType(c.finding_type)} Found`,
        severity: (c.severity || "MEDIUM") as "CRITICAL" | "HIGH" | "MEDIUM" | "SAFE",
        impact: c.recommendation?.impact_summary || "This information could be misused if shared publicly.",
        protectedStatus: `Protected (${maskedVal})`,
        icon: FileText,
      };
    });
  }, [evidenceCards]);

  // Safe document — show green hero instead of alarming red one
  if (isSafe) {
    return (
      <div className="space-y-6">
        <div className="w-full bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#22C55E]/30 shadow-2xl relative overflow-hidden space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Safe to Share</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              No sensitive information detected.
            </h1>
            <p className="text-sm sm:text-base text-[#8CA3B8] max-w-2xl leading-relaxed">
              PersonaShield scanned this document and found no credentials, identity numbers, or sensitive personal information. This document appears safe to share as-is.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#090B14] border border-[#1F2937] flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#8CA3B8]">Risk Level</div>
                <div className="text-xl sm:text-2xl font-black text-[#22C55E]">Safe</div>
                <div className="text-[10px] text-[#8CA3B8] mt-0.5">No threats detected</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E] shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#090B14] border border-[#1F2937] flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#8CA3B8]">Items Found</div>
                <div className="text-xl sm:text-2xl font-black text-white">0 Details</div>
                <div className="text-[10px] text-[#22C55E] mt-0.5">Nothing sensitive</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#090B14] border border-[#1F2937] flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#8CA3B8]">Status</div>
                <div className="text-xl sm:text-2xl font-black text-[#22C55E]">Clean</div>
                <div className="text-[10px] text-[#22C55E] mt-0.5">Ready to share</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Document Information */}
        <div className="bg-[#111827] rounded-3xl p-6 border border-[#1F2937] shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1F2937]">
            <FileCheck2 className="w-4 h-4 text-[#8B5CF6]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Document Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[#8CA3B8] block mb-1">Document Type</span>
              <span className="font-bold text-white text-sm">{docType}</span>
            </div>
            <div>
              <span className="text-[#8CA3B8] flex items-center gap-1 mb-1"><Clock className="w-3.5 h-3.5" /> Scan Time</span>
              <span className="font-medium text-white text-sm">{formattedDate}</span>
            </div>
            <div>
              <span className="text-[#8CA3B8] flex items-center gap-1 mb-1"><Globe className="w-3.5 h-3.5" /> Language</span>
              <span className="font-medium text-white text-sm">Auto-detected</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const RiskIcon = risk.icon;

  return (
    <div className="space-y-6">
      {/* 1. Hero Decision Card — dynamic risk color from receipt.risk_level */}
      <div className={`w-full bg-[#111827] rounded-3xl p-6 sm:p-8 border ${risk.borderColor} shadow-2xl relative overflow-hidden space-y-6`}>
        {/* Top Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${risk.bgColor} border ${risk.borderColor} ${risk.color} text-xs font-bold uppercase tracking-wider`}>
            <RiskIcon className="w-4 h-4" />
            <span>Unsafe to Share (Original Document)</span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Protection Available</span>
          </span>
        </div>

        {/* Headline & Guidance */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Protect this document before sharing.
          </h1>
          <p className="text-sm sm:text-base text-[#8CA3B8] max-w-2xl leading-relaxed">
            PersonaShield detected {findingsCount} sensitive {findingsCount === 1 ? "item" : "items"}. Automatically apply privacy masks to make this document safe to download and share.
          </p>
        </div>

        {/* 3 Decision Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-[#090B14] border border-[#1F2937] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8CA3B8]">
                Risk Level
              </div>
              <div className={`text-xl sm:text-2xl font-black ${risk.color}`}>{risk.label}</div>
              <div className="text-[10px] text-[#8CA3B8] mt-0.5">{categorySummary}</div>
            </div>
            <div className={`w-10 h-10 rounded-xl ${risk.bgColor} border ${risk.borderColor} flex items-center justify-center ${risk.color} shrink-0`}>
              <RiskIcon className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#090B14] border border-[#1F2937] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8CA3B8]">
                Items Found
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{findingsCount} {findingsCount === 1 ? "Detail" : "Details"}</div>
              <div className="text-[10px] text-[#22C55E] mt-0.5">Ready to Protect</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#090B14] border border-[#1F2937] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8CA3B8]">
                Ready After Protection
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#22C55E]">Yes</div>
              <div className="text-[10px] text-[#22C55E] mt-0.5">Sanitized & Masked</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {scanId && (
            <Link to={`/safeshare/${scanId}`}>
              <button
                type="button"
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] text-white font-bold text-sm shadow-xl shadow-[#8B5CF6]/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Protect & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          )}

          {onDownloadClean && (
            <button
              type="button"
              onClick={onDownloadClean}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[#090B14] hover:bg-[#162032] border border-[#1F2937] text-white font-bold text-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#22C55E]" />
              <span>Download Safe Copy</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Document Information */}
      <div className="bg-[#111827] rounded-3xl p-6 border border-[#1F2937] shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#1F2937]">
          <FileCheck2 className="w-4 h-4 text-[#8B5CF6]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Document Information
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-[#8CA3B8] block mb-1">Document Type</span>
            <span className="font-bold text-white text-sm">{docType}</span>
          </div>
          <div>
            <span className="text-[#8CA3B8] flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5" /> Scan Time
            </span>
            <span className="font-medium text-white text-sm">{formattedDate}</span>
          </div>
          <div>
            <span className="text-[#8CA3B8] flex items-center gap-1 mb-1">
              <Globe className="w-3.5 h-3.5" /> Language
            </span>
            <span className="font-medium text-white text-sm">Auto-detected</span>
          </div>
        </div>
      </div>

      {/* 3. Human-Friendly Risk Meter — driven by actual findings only */}
      <div className="w-full bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#1F2937] shadow-xl space-y-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Protection Summary
          </h2>
          <p className="text-xs text-[#8CA3B8]">
            Here is what PersonaShield secured to prevent identity misuse or accidental exposure.
          </p>
        </div>

        {riskMeterItems.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#090B14] border border-[#1F2937]">
            <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
            <span className="text-sm text-[#8CA3B8]">No sensitive items found — this document appears safe to share.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#1F2937] text-[#8CA3B8]">
                  <th className="pb-3 font-semibold w-1/4">Risk Found</th>
                  <th className="pb-3 font-semibold w-1/6">Severity</th>
                  <th className="pb-3 font-semibold w-2/5">Why It Matters</th>
                  <th className="pb-3 font-semibold text-right">Protected Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]/60">
                {riskMeterItems.map((item) => {
                  const Icon = item.icon;
                  const badgeColor =
                    item.severity === "CRITICAL"
                      ? "bg-red-950/80 text-red-400 border-red-500/40"
                      : item.severity === "HIGH"
                      ? "bg-amber-950/80 text-amber-400 border-amber-500/40"
                      : item.severity === "MEDIUM"
                      ? "bg-teal-950/80 text-teal-400 border-teal-500/40"
                      : "bg-emerald-950/80 text-emerald-400 border-emerald-500/40";

                  return (
                    <tr key={item.id} className="hover:bg-[#090B14]/40 transition-colors">
                      <td className="py-3.5 font-bold text-white flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[#8CA3B8] shrink-0" />
                        <span>{item.name}</span>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-3.5 text-[#8CA3B8] leading-relaxed">
                        {item.impact}
                      </td>
                      <td className="py-3.5 text-right font-medium text-[#22C55E]">
                        {item.protectedStatus}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
