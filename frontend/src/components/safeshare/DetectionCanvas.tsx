import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Eye,
  Shield,
  Layers,
  SlidersHorizontal,
  Plus,
  Trash2,
  X,
  CheckCircle2,
} from "lucide-react";
import type { EvidenceCardData, EntityItem } from "../../types/api";

export type VisualizationMode = "detection" | "blur" | "pixelate" | "blackout" | "compare";

export interface CustomRegion {
  id: string;
  label: string;
  mode: "blur" | "pixelate" | "blackout";
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  isCustom: boolean;
}

export interface EditableFindingBox {
  id: string;
  label: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  maskedValue: string;
  bbox: [number, number, number, number];
  mode: "blur" | "pixelate" | "blackout";
  isIgnored: boolean;
  isCustom?: boolean;
}

interface DetectionCanvasProps {
  scanId?: string;
  originalImageUrl: string;
  redactedImageUrl?: string;
  findings?: EvidenceCardData[];
  entities?: EntityItem[];
  activeMode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
  isRegenerating?: boolean;
  selectedId?: string | null;
  onSelectId?: (id: string | null) => void;
  isDrawingMode?: boolean;
  onToggleDrawingMode?: (active: boolean) => void;
  onApplyCustomizations?: (
    customRegions: Array<{ bbox: [number, number, number, number]; mode: string; label?: string }>,
    overrideModes: Record<string, string>,
    selectedFindingIds: string[]
  ) => Promise<void> | void;
}

export const DetectionCanvas: React.FC<DetectionCanvasProps> = ({
  scanId: _scanId,
  originalImageUrl,
  redactedImageUrl,
  findings = [],
  entities = [],
  activeMode,
  onModeChange,
  isRegenerating = false,
  selectedId: controlledSelectedId,
  onSelectId: controlledOnSelectId,
  isDrawingMode: controlledIsDrawingMode,
  onToggleDrawingMode: controlledOnToggleDrawingMode,
  onApplyCustomizations,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Natural image dimensions
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 500,
  });

  // State of all editable boxes
  const [boxes, setBoxes] = useState<EditableFindingBox[]>([]);
  const [customRegions, setCustomRegions] = useState<CustomRegion[]>([]);
  
  // Local vs Controlled selection
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const selectedId = controlledSelectedId !== undefined ? controlledSelectedId : localSelectedId;
  const setSelectedId = (id: string | null) => {
    if (controlledOnSelectId) controlledOnSelectId(id);
    else setLocalSelectedId(id);
  };

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Manual Draw State
  const [localIsDrawingMode, setLocalIsDrawingMode] = useState(false);
  const isDrawingMode = controlledIsDrawingMode !== undefined ? controlledIsDrawingMode : localIsDrawingMode;
  const setIsDrawingMode = (active: boolean) => {
    if (controlledOnToggleDrawingMode) controlledOnToggleDrawingMode(active);
    else setLocalIsDrawingMode(active);
  };

  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawBbox, setCurrentDrawBbox] = useState<[number, number, number, number] | null>(null);
  const [showNewRegionModal, setShowNewRegionModal] = useState(false);
  const [pendingRegionBbox, setPendingRegionBbox] = useState<[number, number, number, number] | null>(null);
  const [newRegionLabel, setNewRegionLabel] = useState("Signature / Face");
  const [newRegionMode, setNewRegionMode] = useState<"blur" | "pixelate" | "blackout">("blackout");

  // Dragging / Resizing existing box
  const [activeDrag, setActiveDrag] = useState<{
    id: string;
    type: "move" | "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    startBbox: [number, number, number, number];
  } | null>(null);

  // Compare mode slider position (0-100%)
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isSliderDragging, setIsSliderDragging] = useState<boolean>(false);

  // Initialize boxes from findings/entities once loaded
  useEffect(() => {
    const list: EditableFindingBox[] = [];

    if (findings.length > 0) {
      findings.forEach((f, idx) => {
        if (f.bbox && f.bbox.length === 4) {
          list.push({
            id: f.id || `f-${idx}`,
            label: f.finding_type?.replace(/_/g, " ") || "Sensitive Item",
            category: f.category || "IDENTITY",
            severity: (f.severity as any) || "HIGH",
            confidence: f.confidence || 0.95,
            maskedValue: f.masked_value || "••••••••",
            bbox: [...f.bbox] as [number, number, number, number],
            mode: "blur",
            isIgnored: false,
          });
        }
      });
    } else if (entities.length > 0) {
      entities.forEach((e, idx) => {
        if (e.bbox && e.bbox.length === 4) {
          const isCrit = ["AWS_ACCESS_KEY", "PRIVATE_KEY", "AADHAAR_NUMBER", "PASSPORT"].includes(e.entity_type);
          list.push({
            id: e.id || `e-${idx}`,
            label: e.entity_type.replace(/_/g, " "),
            category: e.category,
            severity: isCrit ? "CRITICAL" : "MEDIUM",
            confidence: e.confidence || 0.92,
            maskedValue: e.text_snippet || "••••••••",
            bbox: [...e.bbox] as [number, number, number, number],
            mode: "blur",
            isIgnored: false,
          });
        }
      });
    }

    setBoxes(list);
  }, [findings, entities]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    }
  };

  // Convert client coordinates to SVG natural coordinates
  const getNaturalCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      if (!imageRef.current) return null;
      const rect = imageRef.current.getBoundingClientRect();
      const scaleX = imageNaturalSize.width / rect.width;
      const scaleY = imageNaturalSize.height / rect.height;
      const x = Math.max(0, Math.min(imageNaturalSize.width, (clientX - rect.left) * scaleX));
      const y = Math.max(0, Math.min(imageNaturalSize.height, (clientY - rect.top) * scaleY));
      return { x: Math.round(x), y: Math.round(y) };
    },
    [imageNaturalSize]
  );

  // Compare mode slider move
  const handleSliderMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  // Mouse / Touch events for Compare Slider
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isSliderDragging) handleSliderMove(e.clientX);
    };
    const onMouseUp = () => setIsSliderDragging(false);

    if (isSliderDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isSliderDragging]);

  // Handle Box Dragging and Resizing
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!activeDrag || !imageRef.current) return;
      const coords = getNaturalCoords(e.clientX, e.clientY);
      if (!coords) return;

      const deltaX = coords.x - activeDrag.startX;
      const deltaY = coords.y - activeDrag.startY;
      const [x1, y1, x2, y2] = activeDrag.startBbox;

      let newBbox: [number, number, number, number] = [x1, y1, x2, y2];

      if (activeDrag.type === "move") {
        const width = x2 - x1;
        const height = y2 - y1;
        const nx1 = Math.max(0, Math.min(imageNaturalSize.width - width, x1 + deltaX));
        const ny1 = Math.max(0, Math.min(imageNaturalSize.height - height, y1 + deltaY));
        newBbox = [nx1, ny1, nx1 + width, ny1 + height];
      } else if (activeDrag.type === "nw") {
        newBbox = [Math.min(x2 - 10, x1 + deltaX), Math.min(y2 - 10, y1 + deltaY), x2, y2];
      } else if (activeDrag.type === "ne") {
        newBbox = [x1, Math.min(y2 - 10, y1 + deltaY), Math.max(x1 + 10, x2 + deltaX), y2];
      } else if (activeDrag.type === "sw") {
        newBbox = [Math.min(x2 - 10, x1 + deltaX), y1, x2, Math.max(y1 + 10, y2 + deltaY)];
      } else if (activeDrag.type === "se") {
        newBbox = [x1, y1, Math.max(x1 + 10, x2 + deltaX), Math.max(y1 + 10, y2 + deltaY)];
      }

      setBoxes((prev) =>
        prev.map((b) => (b.id === activeDrag.id ? { ...b, bbox: newBbox } : b))
      );
      setCustomRegions((prev) =>
        prev.map((c) => (c.id === activeDrag.id ? { ...c, bbox: newBbox } : c))
      );
    };

    const onMouseUp = () => {
      if (activeDrag && onApplyCustomizations) {
        // Immediate sync on release
        triggerAutoSync();
      }
      setActiveDrag(null);
    };

    if (activeDrag) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [activeDrag, getNaturalCoords, imageNaturalSize, onApplyCustomizations]);

  // Sync helper
  const triggerAutoSync = (
    updatedBoxes = boxes,
    updatedCustom = customRegions
  ) => {
    if (!onApplyCustomizations) return;

    const customList = updatedCustom.map((c) => ({
      bbox: c.bbox,
      mode: c.mode,
      label: c.label,
    }));

    const overrideModes: Record<string, string> = {};
    updatedBoxes.forEach((b) => {
      if (!b.isIgnored && b.mode !== "blur") {
        overrideModes[b.id] = b.mode;
      }
    });

    const selectedIds = updatedBoxes.filter((b) => !b.isIgnored).map((b) => b.id);
    onApplyCustomizations(customList, overrideModes, selectedIds);
  };

  // Handle Manual Drawing of Sensitive Areas
  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawingMode) return;
    const coords = getNaturalCoords(e.clientX, e.clientY);
    if (!coords) return;
    setDrawStart(coords);
    setCurrentDrawBbox([coords.x, coords.y, coords.x, coords.y]);
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawingMode || !drawStart) return;
    const coords = getNaturalCoords(e.clientX, e.clientY);
    if (!coords) return;

    const x1 = Math.min(drawStart.x, coords.x);
    const y1 = Math.min(drawStart.y, coords.y);
    const x2 = Math.max(drawStart.x, coords.x);
    const y2 = Math.max(drawStart.y, coords.y);

    setCurrentDrawBbox([x1, y1, x2, y2]);
  };

  const handleSvgMouseUp = () => {
    if (!isDrawingMode || !currentDrawBbox) return;
    const [x1, y1, x2, y2] = currentDrawBbox;
    if (Math.abs(x2 - x1) > 15 && Math.abs(y2 - y1) > 15) {
      setPendingRegionBbox(currentDrawBbox);
      setShowNewRegionModal(true);
    }
    setDrawStart(null);
    setCurrentDrawBbox(null);
    setIsDrawingMode(false);
  };

  const handleConfirmNewRegion = () => {
    if (!pendingRegionBbox) return;
    const newId = `custom-${Date.now()}`;
    const newReg: CustomRegion = {
      id: newId,
      label: newRegionLabel.trim() || "Custom Protected Area",
      mode: newRegionMode,
      bbox: pendingRegionBbox,
      isCustom: true,
    };
    const nextCustom = [...customRegions, newReg];
    setCustomRegions(nextCustom);
    setSelectedId(newId);
    setShowNewRegionModal(false);
    setPendingRegionBbox(null);
    triggerAutoSync(boxes, nextCustom);
  };

  const handleCancelNewRegion = () => {
    setShowNewRegionModal(false);
    setPendingRegionBbox(null);
  };

  // Change mask mode for a specific item (Immediately saved)
  const handleItemModeChange = (id: string, mode: "blur" | "pixelate" | "blackout") => {
    const nextBoxes = boxes.map((b) => (b.id === id ? { ...b, mode, isIgnored: false } : b));
    const nextCustom = customRegions.map((c) => (c.id === id ? { ...c, mode } : c));
    setBoxes(nextBoxes);
    setCustomRegions(nextCustom);
    triggerAutoSync(nextBoxes, nextCustom);
  };

  // Toggle ignore (or delete custom region)
  const handleItemToggleIgnore = (id: string) => {
    if (id.startsWith("custom-")) {
      const nextCustom = customRegions.filter((c) => c.id !== id);
      setCustomRegions(nextCustom);
      if (selectedId === id) setSelectedId(null);
      triggerAutoSync(boxes, nextCustom);
    } else {
      const nextBoxes = boxes.map((b) => (b.id === id ? { ...b, isIgnored: !b.isIgnored } : b));
      setBoxes(nextBoxes);
      triggerAutoSync(nextBoxes, customRegions);
    }
  };

  const getBoxColor = (severity: string, isIgnored: boolean) => {
    if (isIgnored) {
      return {
        stroke: "#64748B",
        fill: "rgba(100, 116, 139, 0.1)",
        border: "border-slate-600",
        text: "text-slate-400",
        badgeBg: "bg-slate-900/80",
      };
    }
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
          stroke: "#F59E0B",
          fill: "rgba(245, 158, 11, 0.2)",
          border: "border-amber-500",
          text: "text-amber-400",
          badgeBg: "bg-amber-950/80",
        };
      case "MEDIUM":
        return {
          stroke: "#14B8A6",
          fill: "rgba(20, 184, 166, 0.2)",
          border: "border-teal-500",
          text: "text-teal-400",
          badgeBg: "bg-teal-950/80",
        };
      default:
        return {
          stroke: "#8B5CF6",
          fill: "rgba(139, 92, 246, 0.2)",
          border: "border-purple-500",
          text: "text-purple-400",
          badgeBg: "bg-purple-950/80",
        };
    }
  };

  // Find currently selected item
  const selectedBox = boxes.find((b) => b.id === selectedId);
  const selectedCustom = customRegions.find((c) => c.id === selectedId);
  const activeSelectedItem = selectedBox || selectedCustom;

  const currentPreviewSrc =
    activeMode === "detection" || activeMode === "compare"
      ? originalImageUrl
      : redactedImageUrl || originalImageUrl;

  return (
    <div className="w-full bg-[#111827] rounded-3xl p-5 sm:p-7 border border-[#1F2937] shadow-2xl space-y-5">
      {/* 1. Single Protection Editor Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2937]">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#8B5CF6]" />
          <h3 className="text-sm font-bold text-white tracking-tight">Protection Editor</h3>
          <span className="text-xs text-[#8CA3B8] hidden md:inline">• Single Canvas Controller</span>
        </div>

        {/* Toolbar items: Detect | Blur | Pixelate | Blackout | Compare | Add Area */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 bg-[#090B14] p-1 rounded-xl border border-[#1F2937]">
            {(
              [
                { id: "detection", label: "Detect", icon: Eye },
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30"
                      : "text-[#8CA3B8] hover:text-[#E8EEF8] hover:bg-[#1F2937]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Add Area Button */}
          <button
            type="button"
            onClick={() => {
              setIsDrawingMode(!isDrawingMode);
              if (activeMode !== "detection") onModeChange("detection");
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              isDrawingMode
                ? "bg-[#14B8A6] text-white border-[#14B8A6] shadow-lg shadow-[#14B8A6]/30 animate-pulse"
                : "bg-[#162032] text-[#8CA3B8] border-[#1F2937] hover:text-[#E8EEF8] hover:border-[#8B5CF6]/40"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isDrawingMode ? "Draw on Canvas" : "Add Area"}</span>
          </button>
        </div>
      </div>

      {/* 2. Single Image Viewer / Canvas Container */}
      <div
        ref={containerRef}
        className={`relative rounded-2xl overflow-hidden bg-[#090B14] border border-[#1F2937] min-h-[440px] flex items-center justify-center p-4 select-none ${
          isDrawingMode ? "cursor-crosshair" : ""
        }`}
      >
        {isRegenerating ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="w-10 h-10 border-3 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-[#8CA3B8]">
              Rendering {activeMode.toUpperCase()} transformation across detected coordinates...
            </span>
          </div>
        ) : (
          <div className="relative max-w-full max-h-[520px] inline-block shadow-2xl">
            {/* Base Image */}
            <img
              ref={imageRef}
              src={currentPreviewSrc}
              alt="Artifact Canvas"
              onLoad={onImageLoad}
              className={`rounded-xl max-w-full max-h-[520px] object-contain block border border-[#1F2937] ${
                activeMode === "blur" && !redactedImageUrl ? "filter blur-sm" : ""
              } ${
                activeMode === "blackout" && !redactedImageUrl ? "brightness-50" : ""
              }`}
            />

            {/* SVG Interactive Overlay (Inspect / Detect Mode) */}
            {activeMode === "detection" && imageNaturalSize.width > 0 && (
              <svg
                ref={svgRef}
                className="absolute inset-0 w-full h-full"
                viewBox={`0 0 ${imageNaturalSize.width} ${imageNaturalSize.height}`}
                preserveAspectRatio="none"
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
              >
                {/* Finding Boxes */}
                {boxes.map((box) => {
                  const [minX, minY, maxX, maxY] = box.bbox;
                  const width = Math.max(10, maxX - minX);
                  const height = Math.max(10, maxY - minY);
                  const color = getBoxColor(box.severity, box.isIgnored);
                  const isSelected = selectedId === box.id;
                  const isHovered = hoveredId === box.id;

                  return (
                    <g
                      key={box.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(box.id);
                      }}
                      onMouseEnter={() => setHoveredId(box.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <rect
                        x={minX}
                        y={minY}
                        width={width}
                        height={height}
                        fill={
                          isSelected
                            ? "rgba(139, 92, 246, 0.35)"
                            : isHovered
                            ? color.fill
                            : box.isIgnored
                            ? "rgba(100, 116, 139, 0.08)"
                            : "rgba(239, 68, 68, 0.12)"
                        }
                        stroke={isSelected ? "#8B5CF6" : color.stroke}
                        strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
                        strokeDasharray={box.isIgnored ? "4 4" : box.severity === "CRITICAL" ? "none" : "5 2"}
                        rx="4"
                      />

                      {/* Corner Handles if Selected */}
                      {isSelected && (
                        <>
                          <circle
                            cx={minX}
                            cy={minY}
                            r="6"
                            fill="#8B5CF6"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            className="cursor-nwse-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getNaturalCoords(e.clientX, e.clientY);
                              if (coords) {
                                setActiveDrag({
                                  id: box.id,
                                  type: "nw",
                                  startX: coords.x,
                                  startY: coords.y,
                                  startBbox: box.bbox,
                                });
                              }
                            }}
                          />
                          <circle
                            cx={minX + width}
                            cy={minY}
                            r="6"
                            fill="#8B5CF6"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            className="cursor-nesw-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getNaturalCoords(e.clientX, e.clientY);
                              if (coords) {
                                setActiveDrag({
                                  id: box.id,
                                  type: "ne",
                                  startX: coords.x,
                                  startY: coords.y,
                                  startBbox: box.bbox,
                                });
                              }
                            }}
                          />
                          <circle
                            cx={minX}
                            cy={minY + height}
                            r="6"
                            fill="#8B5CF6"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            className="cursor-nesw-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getNaturalCoords(e.clientX, e.clientY);
                              if (coords) {
                                setActiveDrag({
                                  id: box.id,
                                  type: "sw",
                                  startX: coords.x,
                                  startY: coords.y,
                                  startBbox: box.bbox,
                                });
                              }
                            }}
                          />
                          <circle
                            cx={minX + width}
                            cy={minY + height}
                            r="6"
                            fill="#8B5CF6"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            className="cursor-nwse-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getNaturalCoords(e.clientX, e.clientY);
                              if (coords) {
                                setActiveDrag({
                                  id: box.id,
                                  type: "se",
                                  startX: coords.x,
                                  startY: coords.y,
                                  startBbox: box.bbox,
                                });
                              }
                            }}
                          />
                          <circle
                            cx={minX + width / 2}
                            cy={minY + height / 2}
                            r="7"
                            fill="#8B5CF6"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            className="cursor-move"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getNaturalCoords(e.clientX, e.clientY);
                              if (coords) {
                                setActiveDrag({
                                  id: box.id,
                                  type: "move",
                                  startX: coords.x,
                                  startY: coords.y,
                                  startBbox: box.bbox,
                                });
                              }
                            }}
                          />
                        </>
                      )}
                    </g>
                  );
                })}

                {/* Custom User-Drawn Regions */}
                {customRegions.map((custom) => {
                  const [minX, minY, maxX, maxY] = custom.bbox;
                  const width = Math.max(10, maxX - minX);
                  const height = Math.max(10, maxY - minY);
                  const isSelected = selectedId === custom.id;
                  const isHovered = hoveredId === custom.id;

                  return (
                    <g
                      key={custom.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(custom.id);
                      }}
                      onMouseEnter={() => setHoveredId(custom.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <rect
                        x={minX}
                        y={minY}
                        width={width}
                        height={height}
                        fill={isSelected ? "rgba(20, 184, 166, 0.35)" : "rgba(20, 184, 166, 0.15)"}
                        stroke="#14B8A6"
                        strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
                        rx="4"
                      />

                      {isSelected && (
                        <>
                          <circle
                            cx={minX}
                            cy={minY}
                            r="6"
                            fill="#14B8A6"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            className="cursor-nwse-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getNaturalCoords(e.clientX, e.clientY);
                              if (coords) {
                                setActiveDrag({
                                  id: custom.id,
                                  type: "nw",
                                  startX: coords.x,
                                  startY: coords.y,
                                  startBbox: custom.bbox,
                                });
                              }
                            }}
                          />
                          <circle
                            cx={minX + width}
                            cy={minY + height}
                            r="6"
                            fill="#14B8A6"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            className="cursor-nwse-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getNaturalCoords(e.clientX, e.clientY);
                              if (coords) {
                                setActiveDrag({
                                  id: custom.id,
                                  type: "se",
                                  startX: coords.x,
                                  startY: coords.y,
                                  startBbox: custom.bbox,
                                });
                              }
                            }}
                          />
                        </>
                      )}
                    </g>
                  );
                })}

                {/* In-Progress Draw Rectangle */}
                {isDrawingMode && currentDrawBbox && (
                  <rect
                    x={currentDrawBbox[0]}
                    y={currentDrawBbox[1]}
                    width={Math.max(2, currentDrawBbox[2] - currentDrawBbox[0])}
                    height={Math.max(2, currentDrawBbox[3] - currentDrawBbox[1])}
                    fill="rgba(20, 184, 166, 0.25)"
                    stroke="#14B8A6"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    rx="4"
                  />
                )}
              </svg>
            )}

            {/* Split Slider (Compare Mode) */}
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
                    style={{
                      width: imageRef.current?.clientWidth,
                      height: imageRef.current?.clientHeight,
                    }}
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#22C55E]/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                    Protected (Sanitized)
                  </div>
                </div>

                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#EF4444]/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider pointer-events-none">
                  Original (Unprotected)
                </div>

                {/* Slider Handle */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-2xl flex items-center justify-center z-10"
                  style={{ left: `${sliderPosition}%` }}
                  onMouseDown={() => setIsSliderDragging(true)}
                  onTouchMove={(e) => handleSliderMove(e.touches[0].clientX)}
                >
                  <div className="w-7 h-7 rounded-full bg-white shadow-xl flex items-center justify-center text-[#090B14] font-bold text-xs">
                    ↔
                  </div>
                </div>
              </>
            )}

            {/* Verification Guarantee Watermark */}
            <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-[#090B14]/90 backdrop-blur-md border border-[#1F2937] text-[#14B8A6] text-[11px] font-semibold flex items-center gap-1.5 shadow-xl pointer-events-none">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {activeMode === "compare"
                  ? "Before • After (Original never leaves your device)"
                  : activeMode === "detection"
                  ? `${boxes.length + customRegions.length} Protected Zones Tracked`
                  : "All Identifiers & Camera Location Removed"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Selected Detection Panel (Inspector) */}
      {activeSelectedItem && activeMode === "detection" && (
        <div className="bg-[#162032] border border-[#8B5CF6]/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-150">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#8CA3B8]">
              Selected Area
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">
                {activeSelectedItem.label}
              </span>
              {"severity" in activeSelectedItem && (
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    getBoxColor(activeSelectedItem.severity, (activeSelectedItem as any).isIgnored).badgeBg
                  } ${getBoxColor(activeSelectedItem.severity, (activeSelectedItem as any).isIgnored).text} ${
                    getBoxColor(activeSelectedItem.severity, (activeSelectedItem as any).isIgnored).border
                  }`}
                >
                  {activeSelectedItem.severity} • {Math.round(activeSelectedItem.confidence * 100)}% Match
                </span>
              )}
              {activeSelectedItem.isCustom && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-teal-950/80 text-teal-400 border border-teal-500/40">
                  Custom Area
                </span>
              )}
            </div>
          </div>

          {/* Protection Style & Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#090B14] p-1 rounded-xl border border-[#1F2937]">
              <span className="text-[11px] text-[#8CA3B8] font-medium px-2">Protection Style:</span>
              {(["blackout", "blur", "pixelate"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleItemModeChange(activeSelectedItem.id, st)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize border transition-all cursor-pointer ${
                    activeSelectedItem.mode === st && !(activeSelectedItem as any).isIgnored
                      ? "bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-sm shadow-[#8B5CF6]/40"
                      : "bg-[#111827] text-[#8CA3B8] border-[#1F2937] hover:text-[#E8EEF8]"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Quick Actions: Restore / Delete */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleItemToggleIgnore(activeSelectedItem.id)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  (activeSelectedItem as any).isIgnored
                    ? "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/40"
                    : "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/25"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {activeSelectedItem.isCustom
                    ? "Delete"
                    : (activeSelectedItem as any).isIgnored
                    ? "Keep"
                    : "Delete"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="p-1.5 rounded-xl text-[#8CA3B8] hover:text-white hover:bg-[#111827] cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Add Sensitive Area */}
      {showNewRegionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#14B8A6]" />
                <h4 className="text-base font-bold text-white">Protect New Sensitive Area</h4>
              </div>
              <button
                type="button"
                onClick={handleCancelNewRegion}
                className="text-[#8CA3B8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#8CA3B8] mb-1">
                  Area Description
                </label>
                <input
                  type="text"
                  value={newRegionLabel}
                  onChange={(e) => setNewRegionLabel(e.target.value)}
                  placeholder="e.g. Signature, Face Photo, QR Code"
                  className="w-full bg-[#090B14] border border-[#1F2937] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["Signature", "Face Photo", "QR Code", "Private Account"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewRegionLabel(preset)}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-[#162032] border border-[#1F2937] text-[#8CA3B8] hover:text-white hover:border-[#8B5CF6]/40 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8CA3B8] mb-1">
                  Protection Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "blackout", label: "Blackout", desc: "Permanent solid block" },
                      { id: "blur", label: "Blur", desc: "Soft obscuration" },
                      { id: "pixelate", label: "Pixelate", desc: "Large pixels" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setNewRegionMode(opt.id)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        newRegionMode === opt.id
                          ? "bg-[#8B5CF6]/20 border-[#8B5CF6] text-white"
                          : "bg-[#090B14] border-[#1F2937] text-[#8CA3B8] hover:border-[#8B5CF6]/30"
                      }`}
                    >
                      <div className="text-xs font-bold capitalize">{opt.label}</div>
                      <div className="text-[10px] text-[#8CA3B8] mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1F2937]">
              <button
                type="button"
                onClick={handleCancelNewRegion}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8CA3B8] hover:bg-[#162032] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmNewRegion}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#14B8A6] hover:bg-[#0D9488] text-white shadow-lg shadow-[#14B8A6]/20 cursor-pointer"
              >
                Add Protection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
