import React from "react";
import { Shield } from "lucide-react";
import type { SafeShareResponseData } from "../../types/api";

interface SafeShareComparisonProps {
  safeShareData: SafeShareResponseData;
  activeMode: "blur" | "pixelate" | "blackout";
  onModeChange: (mode: "blur" | "pixelate" | "blackout") => void;
  isRegenerating?: boolean;
}

export const SafeShareComparison: React.FC<SafeShareComparisonProps> = ({
  safeShareData,
  activeMode,
  onModeChange,
  isRegenerating = false,
}) => {

  const downloadUrl = safeShareData.download_url;

  return (
    <div className="w-full bg-[#121A2E] rounded-3xl p-6 sm:p-8 border border-[#1E293B] shadow-2xl space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#A855F7]" />
            <span>SafeShare Redacted Asset</span>
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Irreversible privacy redactions applied using stored coordinates — original never leaked
          </p>
        </div>

        {/* Mode Selector Segmented Control */}
        <div className="flex items-center gap-1 bg-[#0B1020] p-1 rounded-xl border border-[#1E293B] self-start sm:self-auto">
          {(["blur", "pixelate", "blackout"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onModeChange(mode)}
              disabled={isRegenerating}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                activeMode === mode
                  ? "bg-[#A855F7] text-white shadow-md shadow-[#A855F7]/20"
                  : "text-[#94A3B8] hover:text-[#E5E7EB]"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Redacted Canvas Preview Container */}
      <div className="relative rounded-2xl overflow-hidden bg-[#0B1020] border border-[#1E293B] min-h-[380px] flex items-center justify-center p-4">
        {isRegenerating ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="w-10 h-10 border-2 border-[#A855F7] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-[#94A3B8]">
              Re-applying {activeMode} redaction on clean canvas...
            </span>
          </div>
        ) : (
          <div className="relative max-w-full max-h-[500px] flex items-center justify-center">
            <img
              src={downloadUrl}
              alt="SafeShare Redacted Preview"
              className="rounded-xl max-w-full max-h-[500px] object-contain shadow-2xl border border-[#1E293B]"
            />

            {/* Privacy Badge overlay */}
            <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-[#0B1020]/90 backdrop-blur-md border border-[#14B8A6]/40 text-[#14B8A6] text-[11px] font-semibold flex items-center gap-1.5 shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />
              <span>Sanitized PNG • EXIF Stripped</span>
            </div>
          </div>
        )}
      </div>

      {/* Redacted Regions Audit Breakdown */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-[#94A3B8]">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-white font-semibold">{safeShareData.total_redacted_regions}</span>{" "}
            Regions Redacted
          </div>
          <div>•</div>
          <div>
            <span className="text-white font-semibold">{safeShareData.applied_findings_count}</span>{" "}
            Findings Covered
          </div>
          <div>•</div>
          <div className="text-[#22C55E] font-medium">100% EXIF & GPS Metadata Removed</div>
        </div>

        <div className="text-[11px] font-mono text-[#64748B]">
          Ref: {safeShareData.redaction_id.slice(0, 8)}...
        </div>
      </div>
    </div>
  );
};
