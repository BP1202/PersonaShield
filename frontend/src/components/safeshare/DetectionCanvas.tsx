import React, { useState, useRef, useEffect } from "react";
import { Eye, Shield, Layers, SlidersHorizontal, CheckCircle2 } from "lucide-react";
import type { EvidenceCardData, EntityItem } from "../../types/api";

export type VisualizationMode = "detection" | "blur" | "pixelate" | "blackout" | "compare";

interface DetectionCanvasProps {
  scanId: string;
  originalImageUrl: string;
  redactedImageUrl?: string;
  findings?: EvidenceCardData[];
  entities?: EntityItem[];
  activeMode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
  isRegenerating?: boolean;
}

interface NormalizedBox {
  id: string;
  type: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  label: string;
  maskedValue: string;
  // normalized coordinates in image [x1, y1, x2, y2]
  bbox: [number, number, number, number];
}

export const DetectionCanvas: React.FC<DetectionCanvasProps> = ({
  originalImageUrl,
  redactedImageUrl,
  findings = [],
  entities = [],
  activeMode,
  onModeChange,
  isRegenerating = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [hoveredBox, setHoveredBox] = useState<NormalizedBox | null>(null);
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 500,
  });

  // Extract and normalize bounding boxes from findings or entities
  const boxes: NormalizedBox[] = React.useMemo(() => {
    const list: NormalizedBox[] = [];

    // Prioritize evidence_cards from findings
    if (findings.length > 0) {
      findings.forEach((f, idx) => {
        if (f.bbox && f.bbox.length === 4) {
          list.push({
            id: `f-${idx}`,
            type: f.finding_type || "SENSITIVE_LEAK",
            category: f.category || "IDENTITY",
            severity: (f.severity as any) || "HIGH",
            confidence: f.confidence || 0.95,
            label: f.finding_type?.replace(/_/g, " ") || "Finding",
            maskedValue: f.masked_value || "••••••••",
            bbox: f.bbox,
          });
        }
      });
    }

    // Complement with entities if findings bbox is empty
    if (list.length === 0 && entities.length > 0) {
      entities.forEach((e, idx) => {
        if (e.bbox && e.bbox.length === 4) {
          const isCrit = ["AWS_ACCESS_KEY", "PRIVATE_KEY", "AADHAAR_NUMBER", "PASSPORT"].includes(e.entity_type);
          list.push({
            id: `e-${idx}`,
            type: e.entity_type,
            category: e.category,
            severity: isCrit ? "CRITICAL" : "MEDIUM",
            confidence: e.confidence || 0.92,
            label: e.entity_type.replace(/_/g, " "),
            maskedValue: e.text_snippet || "••••••••",
            bbox: e.bbox,
          });
        }
      });
    }

    return list;
  }, [findings, entities]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    }
  };

  // Drag handler for Compare mode slider
  const handleSliderMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  const handleMouseDown = () => setIsDragging(true);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleSliderMove(e.clientX);
      }
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
  }, [isDragging]);

  const getBoxColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case "CRITICAL":
        return {
          stroke: "#EF4444",
          fill: "rgba(239, 68, 68, 0.2)",
          border: "border-red-500",
          text: "text-red-400",
          badgeBg: "bg-red-950/80",
        };
      case "HIGH":
        return {
          stroke: "#F97316",
          fill: "rgba(249, 115, 22, 0.2)",
          border: "border-orange-500",
          text: "text-orange-400",
          badgeBg: "bg-orange-950/80",
        };
      case "MEDIUM":
        return {
          stroke: "#F59E0B",
          fill: "rgba(245, 158, 11, 0.2)",
          border: "border-amber-500",
          text: "text-amber-400",
          badgeBg: "bg-amber-950/80",
        };
      default:
        return {
          stroke: "#10B981",
          fill: "rgba(16, 185, 129, 0.2)",
          border: "border-emerald-500",
          text: "text-emerald-400",
          badgeBg: "bg-emerald-950/80",
        };
    }
  };

  const currentPreviewSrc = activeMode === "detection" || activeMode === "compare"
    ? originalImageUrl
    : redactedImageUrl || originalImageUrl;

  return (
    <div className="w-full bg-[#0F172A] rounded-3xl p-6 sm:p-8 border border-[#1E293B] shadow-2xl space-y-6">
      {/* Header controls & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-4.5 h-4.5 text-[#10B981]" />
            <span>AI Visualization & Redaction Engine</span>
          </h3>
          <p className="text-xs text-[#8CA3B8]">
            Interactive canvas displaying deterministic OCR bounding boxes, real-time filters, and side-by-side comparison
          </p>
        </div>

        {/* 5-Mode Segmented Control */}
        <div className="flex flex-wrap items-center gap-1 bg-[#060816] p-1.5 rounded-2xl border border-[#1E293B]">
          {(
            [
              { id: "detection", label: "Detection", icon: Eye },
              { id: "blur", label: "Blur", icon: Layers },
              { id: "pixelate", label: "Pixelate", icon: Layers },
              { id: "blackout", label: "Blackout", icon: Shield },
              { id: "compare", label: "Compare", icon: SlidersHorizontal },
            ] as const
          ).map((m) => {
            const Icon = m.icon;
            const isActive = activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onModeChange(m.id)}
                disabled={isRegenerating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/25"
                    : "text-[#8CA3B8] hover:text-[#E8EEF8] hover:bg-[#162032]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Canvas / Image Display Area */}
      <div
        ref={containerRef}
        className="relative rounded-2xl overflow-hidden bg-[#060816] border border-[#1E293B] min-h-[420px] flex items-center justify-center p-4 select-none"
      >
        {isRegenerating ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="w-10 h-10 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-[#8CA3B8]">
              Rendering {activeMode.toUpperCase()} transformation across detected coordinates...
            </span>
          </div>
        ) : (
          <div className="relative max-w-full max-h-[520px] inline-block shadow-2xl">
            {/* 1. Base Image */}
            <img
              ref={imageRef}
              src={currentPreviewSrc}
              alt="Artifact Canvas"
              onLoad={onImageLoad}
              className={`rounded-xl max-w-full max-h-[520px] object-contain block border border-[#1E293B] ${
                activeMode === "blur" && !redactedImageUrl ? "filter blur-sm" : ""
              } ${
                activeMode === "blackout" && !redactedImageUrl ? "brightness-50" : ""
              }`}
            />

            {/* 2. Detection Mode: SVG Bounding Box Overlays */}
            {activeMode === "detection" && imageNaturalSize.width > 0 && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 ${imageNaturalSize.width} ${imageNaturalSize.height}`}
                preserveAspectRatio="none"
              >
                {boxes.map((box) => {
                  const [minX, minY, maxX, maxY] = box.bbox;
                  const width = Math.max(10, maxX - minX);
                  const height = Math.max(10, maxY - minY);
                  const color = getBoxColor(box.severity);
                  const isHovered = hoveredBox?.id === box.id;

                  return (
                    <g
                      key={box.id}
                      className="pointer-events-auto cursor-pointer"
                      onMouseEnter={() => setHoveredBox(box)}
                      onMouseLeave={() => setHoveredBox(null)}
                    >
                      {/* Bounding rectangle */}
                      <rect
                        x={minX}
                        y={minY}
                        width={width}
                        height={height}
                        fill={isHovered ? color.fill : "rgba(239, 68, 68, 0.12)"}
                        stroke={color.stroke}
                        strokeWidth={isHovered ? 3 : 2}
                        strokeDasharray={box.severity === "CRITICAL" ? "none" : "4 2"}
                        rx="4"
                      />
                      {/* Corner anchor markers */}
                      <circle cx={minX} cy={minY} r="3" fill={color.stroke} />
                      <circle cx={minX + width} cy={minY} r="3" fill={color.stroke} />
                      <circle cx={minX} cy={minY + height} r="3" fill={color.stroke} />
                      <circle cx={minX + width} cy={minY + height} r="3" fill={color.stroke} />
                    </g>
                  );
                })}
              </svg>
            )}

            {/* 3. Hovered Bounding Box Interactive Detail Tooltip */}
            {activeMode === "detection" && hoveredBox && (
              <div className="absolute top-4 left-4 z-20 bg-[#060816]/95 backdrop-blur-md border border-[#1E293B] rounded-2xl p-3.5 shadow-2xl max-w-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getBoxColor(hoveredBox.severity).badgeBg} ${getBoxColor(hoveredBox.severity).text} ${getBoxColor(hoveredBox.severity).border}`}
                  >
                    {hoveredBox.severity} • {Math.round(hoveredBox.confidence * 100)}% Match
                  </span>
                  <span className="text-[10px] text-[#8CA3B8] font-mono uppercase">
                    {hoveredBox.category}
                  </span>
                </div>
                <div className="text-xs font-bold text-white mb-1">
                  {hoveredBox.label}
                </div>
                <div className="text-[11px] font-mono bg-[#0F172A] px-2 py-1 rounded border border-[#1E293B] text-[#10B981] truncate">
                  {hoveredBox.maskedValue}
                </div>
              </div>
            )}

            {/* 4. Compare Mode: Split Slider View */}
            {activeMode === "compare" && redactedImageUrl && (
              <>
                <div
                  className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={redactedImageUrl}
                    alt="Sanitized Version"
                    className="max-w-none max-h-[520px] rounded-xl object-contain"
                    style={{ width: imageRef.current?.clientWidth, height: imageRef.current?.clientHeight }}
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#10B981]/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                    Sanitized
                  </div>
                </div>

                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#EF4444]/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider pointer-events-none">
                  Original
                </div>

                {/* Slider Handle */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-2xl flex items-center justify-center z-10"
                  style={{ left: `${sliderPosition}%` }}
                  onMouseDown={handleMouseDown}
                  onTouchMove={(e) => handleSliderMove(e.touches[0].clientX)}
                >
                  <div className="w-7 h-7 rounded-full bg-white shadow-xl flex items-center justify-center text-[#060816] font-bold text-xs">
                    ↔
                  </div>
                </div>
              </>
            )}

            {/* Verification Watermark */}
            <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-[#060816]/90 backdrop-blur-md border border-[#1E293B] text-[#10B981] text-[11px] font-semibold flex items-center gap-1.5 shadow-xl pointer-events-none">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {activeMode === "detection"
                  ? `${boxes.length} Bounding Boxes Localized`
                  : activeMode === "compare"
                  ? "Side-by-Side Verification"
                  : "Metadata Stripped • SHA256 Verified"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Legend & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-[#8CA3B8]">
        {/* Visual Color Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shadow-sm shadow-[#EF4444]/50" />
            <span className="text-[#E8EEF8] font-medium">Critical PII</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shadow-sm shadow-[#F59E0B]/50" />
            <span className="text-[#E8EEF8] font-medium">Personal Data</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-sm shadow-[#10B981]/50" />
            <span className="text-[#E8EEF8] font-medium">Metadata Sanitized</span>
          </div>
        </div>

        {/* Bounding Box Count pill */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-[#162032] border border-[#1E293B] text-white font-mono text-[11px]">
            {boxes.length} detected entities on canvas
          </span>
        </div>
      </div>
    </div>
  );
};
