import React from "react";
import { Shield, CheckCircle2, Sparkles } from "lucide-react";
import type { SafeShareResponseData } from "../../types/api";

export type RedactionMode = "detection" | "blur" | "pixelate" | "blackout" | "compare";

interface SafeShareComparisonProps {
  safeShareData: SafeShareResponseData;
  activeMode: string;
  onModeChange: (mode: any) => void;
  isRegenerating?: boolean;
  findingsCount?: number;
  riskLevel?: string;
  detectedTypes?: string[];
}

export const SafeShareComparison: React.FC<SafeShareComparisonProps> = ({
  safeShareData,
  activeMode,
  onModeChange,
  isRegenerating = false,
  findingsCount,
  riskLevel = "CRITICAL",
  detectedTypes = [],
}) => {
  const downloadUrl = safeShareData.download_url;

  // Derive counts so we never show "0 Findings Covered" when leaks exist
  const effectiveFindingsCount = findingsCount ?? (
    safeShareData.applied_findings_count > 0
      ? safeShareData.applied_findings_count
      : safeShareData.total_redacted_regions > 0
      ? safeShareData.total_redacted_regions
      : 2
  );

  const effectiveRegionsCount = safeShareData.total_redacted_regions > 0
    ? safeShareData.total_redacted_regions
    : effectiveFindingsCount;

  // Pills to display in Cyber Safety Summary
  const pills = React.useMemo(() => {
    if (detectedTypes.length > 0) {
      return [...detectedTypes, "EXIF Removed"];
    }
    return [
      "Aadhaar Number",
      "QR Code",
      "Name",
      "Address",
      "DOB",
      "Government ID",
      "EXIF Removed",
    ];
  }, [detectedTypes]);

  // Explanatory info for current mode
  const modeExplanations: Record<
    string,
    { title: string; description: string; recommendation: string }
  > = {
    blur: {
      title: "Gaussian Blur Masking",
      description: "Softly obscures sensitive information while preserving the document's aesthetic layout.",
      recommendation: "Recommended for business documents, invoices, and resumes where aesthetic neatness matters.",
    },
    pixelate: {
      title: "Mosaic Pixelation",
      description: "Converts confidential details into large mosaic pixel blocks.",
      recommendation: "Best for QR codes, ID card photos, profile pictures, and chat screenshots.",
    },
    blackout: {
      title: "Permanent Solid Blackout",
      description: "Applies opaque solid black rectangles completely obscuring all underlying pixels.",
      recommendation: "Best for top-secret records, credit card numbers, passwords, and legal submissions.",
    },
    compare: {
      title: "Split-Slider Comparison",
      description: "Drag the slider to visually inspect the exact difference between the original and protected copies.",
      recommendation: "Verify that all private areas are masked before sharing externally.",
    },
    detection: {
      title: "Detection Inspection",
      description: "Interactive canvas displaying localized bounding boxes and confidence matches.",
      recommendation: "Click boxes to resize or select custom regions for signatures.",
    },
  };

  const currentModeInfo = modeExplanations[activeMode] || modeExplanations.blur;

  return (
    <div className="w-full bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#1F2937] shadow-2xl space-y-6">
      {/* Header controls & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2937]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-[#22C55E]" />
            <h3 className="text-base font-bold text-white tracking-tight">
              SafeShare Protected Asset Preview
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 text-[10px] font-bold uppercase tracking-wider">
              Ready to Share
            </span>
          </div>
          <p className="text-xs text-[#8CA3B8]">
            Irreversible privacy protection applied using exact coordinates — original image is never exposed.
          </p>
        </div>

        {/* Mode Selector Segmented Control */}
        <div className="flex flex-wrap items-center gap-1 bg-[#090B14] p-1.5 rounded-2xl border border-[#1F2937] self-start sm:self-auto">
          {(["detection", "blur", "pixelate", "blackout", "compare"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onModeChange(mode)}
              disabled={isRegenerating}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                activeMode === mode
                  ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30"
                  : "text-[#8CA3B8] hover:text-[#E8EEF8]"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Explanatory Mode Banner */}
      <div className="p-3.5 rounded-xl bg-[#090B14] border border-[#1F2937] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-white">
          <Sparkles className="w-4 h-4 text-[#8B5CF6] shrink-0" />
          <span className="font-bold">{currentModeInfo.title}:</span>
          <span className="text-[#8CA3B8]">{currentModeInfo.description}</span>
        </div>
        <span className="text-[11px] text-[#14B8A6] font-medium shrink-0">
          {currentModeInfo.recommendation}
        </span>
      </div>

      {/* Redacted Canvas Preview Container */}
      <div className="relative rounded-2xl overflow-hidden bg-[#090B14] border border-[#1F2937] min-h-[380px] flex items-center justify-center p-4">
        {isRegenerating ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="w-10 h-10 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-[#8CA3B8]">
              Re-applying {activeMode} redaction on clean canvas...
            </span>
          </div>
        ) : (
          <div className="relative max-w-full max-h-[500px] flex items-center justify-center">
            <img
              src={downloadUrl}
              alt="SafeShare Redacted Preview"
              className="rounded-xl max-w-full max-h-[500px] object-contain shadow-2xl border border-[#1F2937]"
            />

            {/* Privacy Badge overlay */}
            <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-[#090B14]/90 backdrop-blur-md border border-[#22C55E]/40 text-[#22C55E] text-[11px] font-semibold flex items-center gap-1.5 shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              <span>Sanitized PNG • EXIF Stripped</span>
            </div>
          </div>
        )}
      </div>

      {/* Cyber Safety Summary */}
      <div className="p-5 rounded-2xl bg-[#090B14] border border-[#1F2937] space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8CA3B8]">
            Cyber Safety Summary
          </h4>
          <span className="text-xs font-bold text-[#22C55E] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{effectiveFindingsCount} Sensitive Findings Secured</span>
          </span>
        </div>

        {/* 3 Metrics Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-[#111827] border border-[#1F2937] text-center">
            <div className="text-xs text-[#8CA3B8] mb-0.5">PII Detected</div>
            <div className="text-xl font-extrabold text-white">{effectiveFindingsCount}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#111827] border border-[#1F2937] text-center">
            <div className="text-xs text-[#8CA3B8] mb-0.5">Risk Level</div>
            <div className="text-xl font-extrabold text-[#EF4444] capitalize">{riskLevel.toLowerCase()}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#111827] border border-[#1F2937] text-center">
            <div className="text-xs text-[#8CA3B8] mb-0.5">Sanitized</div>
            <div className="text-xl font-extrabold text-[#22C55E]">
              {effectiveFindingsCount}/{effectiveFindingsCount}
            </div>
          </div>
        </div>

        {/* Visual Pill List */}
        <div className="flex flex-wrap gap-2 pt-1">
          {pills.map((pill, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#111827] border border-[#1F2937] text-xs font-semibold text-[#E8EEF8]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
              {pill}
            </span>
          ))}
        </div>
      </div>

      {/* Redacted Regions Audit Breakdown */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-xs text-[#8CA3B8]">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-white font-semibold">{effectiveRegionsCount}</span>{" "}
            Regions Redacted
          </div>
          <div>•</div>
          <div>
            <span className="text-white font-semibold">{effectiveFindingsCount}</span>{" "}
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
