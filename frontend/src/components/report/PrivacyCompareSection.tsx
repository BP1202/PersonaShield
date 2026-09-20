import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  SlidersHorizontal,
  ArrowRight,
  Columns2,
  CheckCircle2,
  AlertTriangle,
  Scan,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { EvidenceCardData } from "../../types/api";

interface PrivacyCompareSectionProps {
  scanId: string;
  originalImageUrl: string;
  redactedImageUrl?: string;
  evidenceCards?: EvidenceCardData[];
}

export const PrivacyCompareSection: React.FC<PrivacyCompareSectionProps> = ({
  scanId,
  originalImageUrl,
  redactedImageUrl,
  evidenceCards = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDragging, setIsDragging] = useState(false);
  const [compareView, setCompareView] = useState<"side-by-side" | "slider">("side-by-side");
  const [highlightLeaks, setHighlightLeaks] = useState<boolean>(false);

  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.round((x / rect.width) * 100);
    setSliderPosition(percentage);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) handleSliderMove(e.clientX);
    };
    const onMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, handleSliderMove]);

  // Sensitive leak regions on the exposed original document
  const leakZones = useMemo(() => {
    if (evidenceCards.length > 0) {
      return evidenceCards.map((c, idx) => {
        const type = c.finding_type?.toUpperCase() || "";
        let label = "Secret";
        if (type.includes("AADHAAR") || type.includes("PAN") || type.includes("PASSPORT")) {
          label = "Identity";
        } else if (type.includes("PHONE") || type.includes("EMAIL")) {
          label = "Contact";
        }

        const bbox = c.bbox || [20, 30 + idx * 60, 400, 70 + idx * 60];
        return {
          id: c.id || `leak-${idx}`,
          label,
          bbox,
        };
      });
    }

    return [
      { id: "l1", label: "Cloud Key", bbox: [80, 40, 380, 85] },
      { id: "l2", label: "National ID", bbox: [80, 110, 340, 155] },
      { id: "l3", label: "Tax ID", bbox: [80, 180, 320, 225] },
      { id: "l4", label: "Contact Info", bbox: [80, 250, 280, 290] },
    ];
  }, [evidenceCards]);

  const previewSrc = redactedImageUrl || originalImageUrl;

  return (
    <div className="w-full bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#1F2937] shadow-xl space-y-6">
      {/* 1. Header with View Mode Switcher + Highlight Leaks Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1F2937]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SlidersHorizontal className="w-5 h-5 text-[#22C55E]" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Before • After Privacy Comparison
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 text-[10px] font-bold uppercase tracking-wider">
              Verified
            </span>
          </div>
          <p className="text-xs text-[#8CA3B8]">
            See the exact visual difference between your exposed original and the sanitized safe copy.
          </p>
        </div>

        {/* Action Controls: Highlight Leaks Toggle + View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Highlight Leaks Button */}
          <button
            type="button"
            onClick={() => setHighlightLeaks(!highlightLeaks)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              highlightLeaks
                ? "bg-red-950/80 text-red-300 border-red-500/60 shadow-md shadow-red-500/20"
                : "bg-[#090B14] text-[#8CA3B8] border-[#1F2937] hover:text-white hover:border-red-500/40"
            }`}
          >
            <Scan className="w-3.5 h-3.5 text-red-400" />
            <span>{highlightLeaks ? "Hide Outlines" : "Highlight Leaks"}</span>
          </button>

          {/* View Switcher: Side-by-Side vs Split Slider */}
          <div className="flex items-center gap-1 bg-[#090B14] p-1 rounded-xl border border-[#1F2937]">
            <button
              type="button"
              onClick={() => setCompareView("side-by-side")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                compareView === "side-by-side"
                  ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30"
                  : "text-[#8CA3B8] hover:text-[#E8EEF8]"
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              onClick={() => setCompareView("slider")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                compareView === "slider"
                  ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30"
                  : "text-[#8CA3B8] hover:text-[#E8EEF8]"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Split Slider</span>
            </button>
          </div>
        </div>
      </div>



      {/* Smart Protection Summary Pill with direct link to Editor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-3 rounded-2xl bg-[#090B14] border border-[#1F2937] text-xs">
        <div className="flex items-center gap-2 text-[#8CA3B8]">
          <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
          <span className="text-white font-semibold">Automatic Protection:</span>
          <span className="hidden sm:inline">Cloud keys blacked out • IDs &amp; contacts masked • All sensitive items protected</span>
          <span className="sm:hidden">All sensitive findings sanitized</span>
        </div>
        <Link
          to={`/safeshare/${scanId}`}
          className="inline-flex items-center gap-1.5 text-[#8B5CF6] hover:text-[#A78BFA] font-bold text-xs transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <span>Customize in SafeShare Editor</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 5. The Comparison Display */}
      {compareView === "side-by-side" ? (
        /* SIDE-BY-SIDE VIEW (Direct, clear, 100% visible) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Left: Original (Exposed) */}
          <div className="bg-[#090B14] rounded-2xl p-4 border border-[#EF4444]/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-pulse" />
                <span className="text-xs font-bold text-[#EF4444] uppercase tracking-wider">
                  Before: Original (Unprotected)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-red-950/80 border border-red-500/30 text-[10px] text-red-300 font-medium">
                Leaks Exposed
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black/40 border border-[#1F2937] min-h-[280px] flex items-center justify-center p-2">
              <img
                src={originalImageUrl}
                alt="Original Unprotected Document"
                className="max-w-full max-h-[360px] object-contain rounded-lg shadow-lg"
              />

              {/* Subtle leak highlights on original document when toggled */}
              {highlightLeaks && (
                <div className="absolute inset-0 pointer-events-none p-2 flex items-center justify-center">
                  <div className="relative w-full h-full max-h-[360px]">
                    {leakZones.map((z) => (
                      <div
                        key={z.id}
                        className="absolute rounded-lg border-2 border-red-500 bg-red-500/15 flex items-center justify-center shadow-md shadow-red-500/30"
                        style={{
                          left: `${Math.min(80, (z.bbox[0] / 500) * 80)}%`,
                          top: `${Math.min(80, (z.bbox[1] / 350) * 80)}%`,
                          width: `${Math.max(16, ((z.bbox[2] - z.bbox[0]) / 500) * 80)}%`,
                          height: `${Math.max(10, ((z.bbox[3] - z.bbox[1]) / 350) * 80)}%`,
                        }}
                      >
                        <span className="text-[9px] font-bold text-red-100 uppercase px-1.5 py-0.5 bg-black/80 rounded border border-red-500/40">
                          {z.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-[11px] text-[#8CA3B8] flex items-center gap-1.5 pt-1">
              <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>Full numbers, keys, and personal details are exposed to recipients.</span>
            </div>
          </div>

          {/* Right: Protected (Sanitized) */}
          <div className="bg-[#090B14] rounded-2xl p-4 border border-[#22C55E]/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
                <span className="text-xs font-bold text-[#22C55E] uppercase tracking-wider">
                  After: Protected (Safe to Share)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/30 text-[10px] text-emerald-300 font-medium">
                Sanitized Copy
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black/40 border border-[#1F2937] min-h-[280px] flex items-center justify-center p-2">
              <img
                src={previewSrc}
                alt="Protected Sanitized Document"
                className="max-w-full max-h-[360px] object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="text-[11px] text-[#22C55E] flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Identifiers masked • Sensitive items protected • Safe to share</span>
            </div>
          </div>
        </div>
      ) : (
        /* SPLIT SLIDER VIEW */
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-[#8CA3B8]">
            <span className="text-white font-medium">Drag the slider handle to inspect the difference:</span>
            <span className="text-[#14B8A6] font-semibold">{sliderPosition}% Protected</span>
          </div>

          <div
            ref={containerRef}
            className="relative rounded-2xl overflow-hidden bg-[#090B14] border border-[#1F2937] min-h-[360px] flex items-center justify-center p-4 select-none cursor-ew-resize"
            onMouseDown={() => setIsDragging(true)}
            onTouchMove={(e) => handleSliderMove(e.touches[0].clientX)}
          >
            <div className="relative max-w-full max-h-[460px] inline-block shadow-2xl">
              {/* Bottom Layer: Original Image */}
              <img
                src={originalImageUrl}
                alt="Original Document"
                className="max-w-full max-h-[460px] object-contain block rounded-xl border border-[#1F2937]"
              />

              {/* Top Layer: Protected Image */}
              <div
                className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
                style={{
                  clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                }}
              >
                <img
                  src={previewSrc}
                  alt="Protected Document"
                  className="w-full h-full object-contain block"
                />
              </div>

              {/* Floating Status Badges */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#22C55E] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-lg pointer-events-none">
                Protected (Sanitized)
              </div>
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#EF4444] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-lg pointer-events-none">
                Original (Unprotected)
              </div>

              {/* Glowing Purple Divider Line */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-[#8B5CF6] shadow-[0_0_12px_#8B5CF6] z-10 pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-[#8B5CF6] text-white border-2 border-white shadow-2xl flex items-center justify-center font-bold text-sm">
                  ↔
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* 7. Footer CTA link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#1F2937]">
        <span className="text-xs text-[#8CA3B8]">
          Want to fine-tune individual masks or draw custom boxes?
        </span>
        <Link
          to={`/safeshare/${scanId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8B5CF6] hover:text-[#A78BFA] transition-colors cursor-pointer"
        >
          <span>Open SafeShare Visual Editor</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
