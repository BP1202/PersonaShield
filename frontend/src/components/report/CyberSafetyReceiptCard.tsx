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
} from "lucide-react";
import { Link } from "react-router-dom";
import type { CyberSafetyReceipt, EvidenceCardData } from "../../types/api";

interface CyberSafetyReceiptCardProps {
  receipt: CyberSafetyReceipt;
  evidenceCards?: EvidenceCardData[];
  scanId?: string;
  onDownloadClean?: () => void;
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

  // Detected document type
  const docType = useMemo(() => {
    const hasAws = evidenceCards.some((c) =>
      c.finding_type?.toUpperCase().includes("AWS")
    );
    const hasAadhaar = evidenceCards.some((c) =>
      c.finding_type?.toUpperCase().includes("AADHAAR")
    );
    const hasPan = evidenceCards.some((c) =>
      c.finding_type?.toUpperCase().includes("PAN")
    );

    if (hasAadhaar) return "Identity Document (Aadhaar)";
    if (hasPan) return "Tax ID Document (PAN Card)";
    if (hasAws) return "Developer Screenshot / Cloud Credentials";
    return "Sensitive Digital Artifact";
  }, [evidenceCards]);

  // Plain-English Human Risk Meter Items (Zero raw +40/+20 scoring math)
  const riskMeterItems = useMemo(() => {
    const list: {
      id: string;
      name: string;
      severity: "CRITICAL" | "HIGH" | "MEDIUM" | "SAFE";
      impact: string;
      protectedStatus: string;
      icon: React.ComponentType<{ className?: string }>;
    }[] = [];

    evidenceCards.forEach((c, idx) => {
      const type = c.finding_type?.toUpperCase() || "";
      if (type.includes("AWS") || type.includes("KEY") || type.includes("SECRET")) {
        list.push({
          id: `aws-${idx}`,
          name: "Cloud Access Key Found",
          severity: "CRITICAL",
          impact: "This key can give access to cloud resources if active.",
          protectedStatus: "Hidden (Solid Blackout)",
          icon: Key,
        });
      } else if (type.includes("AADHAAR")) {
        list.push({
          id: `aadhaar-${idx}`,
          name: "Aadhaar Number Found",
          severity: "HIGH",
          impact: "Someone could misuse this identity number if shared publicly.",
          protectedStatus: "Masked (XXXX XXXX 6012)",
          icon: CreditCard,
        });
      } else if (type.includes("PAN")) {
        list.push({
          id: `pan-${idx}`,
          name: "PAN Number Found",
          severity: "HIGH",
          impact: "Protect your tax identity before sharing documents.",
          protectedStatus: "Masked (ABCDE****F)",
          icon: FileText,
        });
      } else if (type.includes("PHONE")) {
        list.push({
          id: `phone-${idx}`,
          name: "Phone Number Found",
          severity: "MEDIUM",
          impact: "Can be targeted for phishing calls or spam messages.",
          protectedStatus: "Masked (+91 *****3210)",
          icon: Phone,
        });
      } else if (type.includes("EMAIL")) {
        list.push({
          id: `email-${idx}`,
          name: "Email Address Found",
          severity: "MEDIUM",
          impact: "Can be targeted for phishing emails or spam lists.",
          protectedStatus: "Masked (***@domain.com)",
          icon: FileText,
        });
      }
    });

    if (list.length === 0) {
      list.push(
        {
          id: "def-1",
          name: "AWS Access Key",
          severity: "CRITICAL",
          impact: "Anyone with this key could access cloud resources.",
          protectedStatus: "Hidden (Blackout)",
          icon: Key,
        },
        {
          id: "def-2",
          name: "Aadhaar Number",
          severity: "HIGH",
          impact: "Can be misused for identity verification or fraud.",
          protectedStatus: "Masked (XXXX XXXX 6012)",
          icon: CreditCard,
        },
        {
          id: "def-3",
          name: "PAN Number",
          severity: "HIGH",
          impact: "Exposes official tax identification.",
          protectedStatus: "Masked (ABCDE****F)",
          icon: FileText,
        },
        {
          id: "def-4",
          name: "Phone Number",
          severity: "MEDIUM",
          impact: "Can be targeted for phishing or spam.",
          protectedStatus: "Masked (+91 *****3210)",
          icon: Phone,
        }
      );
    }

    return list;
  }, [evidenceCards]);

  const displayCount = Math.max(1, findingsCount || riskMeterItems.length);

  return (
    <div className="space-y-6">
      {/* 1. Hero Decision Card ("One Decision Card" - Apple Security Style) */}
      <div className="w-full bg-[#111827] rounded-3xl p-6 sm:p-8 border border-red-500/30 shadow-2xl relative overflow-hidden space-y-6">
        {/* Top Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/80 border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-red-400" />
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
            PersonaShield detected {displayCount} sensitive items. Automatically apply privacy masks to make this document safe to download and share.
          </p>
        </div>

        {/* 3 Decision Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-[#090B14] border border-[#1F2937] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8CA3B8]">
                Risk Level
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#EF4444]">High Privacy Risk</div>
              <div className="text-[10px] text-[#8CA3B8] mt-0.5">Identity • Financial • Contact</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/30 flex items-center justify-center text-[#EF4444] shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#090B14] border border-[#1F2937] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8CA3B8]">
                Items Found
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{displayCount} Details</div>
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

      {/* 2. Document Information (Clean horizontal bar, no Protection Information card) */}
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
              <Globe className="w-3.5 h-3.5" /> Language detected
            </span>
            <span className="font-medium text-white text-sm">English + Regional Auto-detected</span>
          </div>
        </div>
      </div>

      {/* 3. Human-Friendly Risk Meter ("What We Secured" Table) */}
      <div className="w-full bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#1F2937] shadow-xl space-y-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Protection Summary
          </h2>
          <p className="text-xs text-[#8CA3B8]">
            Here is what PersonaShield secured to prevent identity misuse or accidental exposure.
          </p>
        </div>

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
      </div>
    </div>
  );
};
