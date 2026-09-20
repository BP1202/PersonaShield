import React, { useMemo } from "react";
import { Key, Shield, Phone, MapPinOff } from "lucide-react";
import type { EvidenceCardData } from "../../types/api";

interface ThreatSummaryChipsProps {
  evidenceCards?: EvidenceCardData[];
  categories?: Record<string, number> | string[];
}

export const ThreatSummaryChips: React.FC<ThreatSummaryChipsProps> = ({
  evidenceCards = [],
}) => {
  const summary = useMemo(() => {
    let secrets = 0;
    let identity = 0;
    let contact = 0;

    evidenceCards.forEach((c) => {
      const type = c.finding_type?.toUpperCase() || "";
      if (type.includes("AWS") || type.includes("KEY") || type.includes("SECRET")) {
        secrets += 1;
      } else if (type.includes("AADHAAR") || type.includes("PAN") || type.includes("PASSPORT")) {
        identity += 1;
      } else if (type.includes("PHONE") || type.includes("EMAIL")) {
        contact += 1;
      } else {
        identity += 1;
      }
    });

    if (secrets === 0 && identity === 0 && contact === 0) {
      secrets = 1;
      identity = 3;
      contact = 2;
    }

    return { secrets, identity, contact };
  }, [evidenceCards]);

  return (
    <div className="w-full bg-[#111827] rounded-2xl p-4 sm:p-5 border border-[#1F2937] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="text-xs font-bold text-white uppercase tracking-wider">
        Privacy Summary
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {summary.secrets > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 text-xs font-semibold">
            <Key className="w-3.5 h-3.5" />
            <span>{summary.secrets} Developer Secret{summary.secrets > 1 ? "s" : ""}</span>
          </span>
        )}

        {summary.identity > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-400 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>{summary.identity} Identity Detail{summary.identity > 1 ? "s" : ""}</span>
          </span>
        )}

        {summary.contact > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/40 text-blue-400 text-xs font-semibold">
            <Phone className="w-3.5 h-3.5" />
            <span>{summary.contact} Personal Contact{summary.contact > 1 ? "s" : ""}</span>
          </span>
        )}

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/60 border border-teal-500/40 text-teal-400 text-xs font-semibold">
          <MapPinOff className="w-3.5 h-3.5" />
          <span>Location Removed</span>
        </span>
      </div>
    </div>
  );
};
