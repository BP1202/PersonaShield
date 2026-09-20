import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Eye,
  Edit3,
  SlidersHorizontal,
  Plus,
  Trash2,
  Copy,
  Layers,
  EyeOff,
  Shield,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
} from "lucide-react";
import type { EvidenceCardData, EntityItem } from "../../types/api";


export interface CustomRegion {
  id: string;
  label: string;
  mode: "blur" | "pixelate" | "blackout";
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  isCustom: boolean;
  isIgnored?: boolean;
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
  activeMode?: any;
  onModeChange?: (mode: any) => void;
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
  isRegenerating: _isRegenerating = false,
  selectedId: controlledSelectedId,
  onSelectId: controlledOnSelectId,
  isDrawingMode: controlledIsDrawingMode,
  onToggleDrawingMode: controlledOnToggleDrawingMode,
  onApplyCustomizations,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);


  // Compare Slider Toggle
  const [showCompareSlider, setShowCompareSlider] = useState(false);
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isSliderDragging, setIsSliderDragging] = useState(false);

  // Right-side collapsible Detection Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Natural image dimensions
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 500,
  });

  // State of all editable boxes
  const [boxes, setBoxes] = useState<EditableFindingBox[]>([]);
  const [customRegions, setCustomRegions] = useState<CustomRegion[]>([]);

  // Selection
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const selectedId = controlledSelectedId !== undefined ? controlledSelectedId : localSelectedId;
  const setSelectedId = (id: string | null) => {
    if (controlledOnSelectId) controlledOnSelectId(id);
    else setLocalSelectedId(id);
  };

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Inline rename state for toolbar
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [tempLabel, setTempLabel] = useState("");

  // Manual Draw State
  const [localIsDrawingMode, setLocalIsDrawingMode] = useState(false);
  const isDrawingMode = controlledIsDrawingMode !== undefined ? controlledIsDrawingMode : localIsDrawingMode;
  const setIsDrawingMode = (active: boolean) => {
    if (controlledOnToggleDrawingMode) controlledOnToggleDrawingMode(active);
    else setLocalIsDrawingMode(active);
  };

  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawBbox, setCurrentDrawBbox] = useState<[number, number, number, number] | null>(null);
  
  // Modal State for new region
  const [showNewRegionModal, setShowNewRegionModal] = useState(false);
  const [pendingRegionBbox, setPendingRegionBbox] = useState<[number, number, number, number] | null>(null);
  const [newRegionCategory, setNewRegionCategory] = useState<string>("Face");
  const [regionCustomLabel, setRegionCustomLabel] = useState<string>("Face");
  const [newRegionMode, setNewRegionMode] = useState<"blur" | "pixelate" | "blackout">("blur");

  // Dragging / Resizing existing box
  const [activeDrag, setActiveDrag] = useState<{
    id: string;
    type: "move" | "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    startBbox: [number, number, number, number];
  } | null>(null);

  // Initialize boxes from findings/entities
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
  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.round((x / rect.width) * 100);
    setSliderPosition(percentage);
  }, []);

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
  }, [isSliderDragging, handleSliderMove]);

  // Box Dragging & Resizing
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
      if (activeDrag) triggerAutoSync();
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
  }, [activeDrag, getNaturalCoords, imageNaturalSize]);

  // Sync helper
  const triggerAutoSync = (
    updatedBoxes = boxes,
    updatedCustom = customRegions
  ) => {
    if (!onApplyCustomizations) return;

    const customList = updatedCustom
      .filter((c) => !c.isIgnored)
      .map((c) => ({
        bbox: c.bbox,
        mode: c.mode,
        label: c.label,
      }));

    const overrideModes: Record<string, string> = {};
    updatedBoxes.forEach((b) => {
      if (!b.isIgnored && b.mode) {
        overrideModes[b.id] = b.mode;
      }
    });

    const selectedIds = updatedBoxes.filter((b) => !b.isIgnored).map((b) => b.id);
    onApplyCustomizations(customList, overrideModes, selectedIds);
  };

  // Drawing manual regions
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
      setNewRegionCategory("Face");
      setRegionCustomLabel("Face");
      setShowNewRegionModal(true);
    }
    setDrawStart(null);
    setCurrentDrawBbox(null);
    setIsDrawingMode(false);
  };

  const handleConfirmNewRegion = () => {
    if (!pendingRegionBbox) return;
    const finalLabel = regionCustomLabel.trim() || newRegionCategory || "Custom Mask";
    const newId = `custom-${Date.now()}`;
    const newReg: CustomRegion = {
      id: newId,
      label: finalLabel,
      mode: newRegionMode,
      bbox: pendingRegionBbox,
      isCustom: true,
      isIgnored: false,
    };
    const nextCustom = [...customRegions, newReg];
    setCustomRegions(nextCustom);
    setSelectedId(newId);
    setShowNewRegionModal(false);
    setPendingRegionBbox(null);
    setRegionCustomLabel("");
    triggerAutoSync(boxes, nextCustom);
  };

  // Toggle mask state: Allow user to unmask (keep visible) or mask
  const handleToggleMask = (id: string = selectedId || "") => {
    if (!id) return;
    const isBox = boxes.some((b) => b.id === id);
    if (isBox) {
      const nextBoxes = boxes.map((b) =>
        b.id === id ? { ...b, isIgnored: !b.isIgnored } : b
      );
      setBoxes(nextBoxes);
      triggerAutoSync(nextBoxes, customRegions);
    } else {
      const nextCustom = customRegions.map((c) =>
        c.id === id ? { ...c, isIgnored: !c.isIgnored } : c
      );
      setCustomRegions(nextCustom);
      triggerAutoSync(boxes, nextCustom);
    }
  };

  // Style change: Automatically ensures area is masked with that style
  const handleStyleChange = (mode: "blur" | "pixelate" | "blackout") => {
    if (!selectedId) return;
    const nextBoxes = boxes.map((b) =>
      b.id === selectedId ? { ...b, mode, isIgnored: false } : b
    );
    const nextCustom = customRegions.map((c) =>
      c.id === selectedId ? { ...c, mode, isIgnored: false } : c
    );
    setBoxes(nextBoxes);
    setCustomRegions(nextCustom);
    triggerAutoSync(nextBoxes, nextCustom);
  };

  // Delete box: For custom regions, removes them; for auto-detected, unmasks them
  const handleDelete = (id: string = selectedId || "") => {
    if (!id) return;
    if (id.startsWith("custom-")) {
      const nextCustom = customRegions.filter((c) => c.id !== id);
      setCustomRegions(nextCustom);
      if (selectedId === id) setSelectedId(null);
      triggerAutoSync(boxes, nextCustom);
    } else {
      // Auto-detected item: toggle to ignored (unmasked / visible)
      const nextBoxes = boxes.map((b) => (b.id === id ? { ...b, isIgnored: true } : b));
      setBoxes(nextBoxes);
      triggerAutoSync(nextBoxes, customRegions);
    }
  };

  // Rename action
  const handleConfirmRename = () => {
    if (!selectedId || !tempLabel.trim()) return;
    const newLabel = tempLabel.trim();
    const nextBoxes = boxes.map((b) => (b.id === selectedId ? { ...b, label: newLabel } : b));
    const nextCustom = customRegions.map((c) => (c.id === selectedId ? { ...c, label: newLabel } : c));
    setBoxes(nextBoxes);
    setCustomRegions(nextCustom);
    setIsEditingLabel(false);
    triggerAutoSync(nextBoxes, nextCustom);
  };

  const handleDuplicate = () => {
    if (!selectedId) return;
    const target = activeSelectedItem;
    if (!target) return;

    const [x1, y1, x2, y2] = target.bbox;
    const offset = 20;
    const newId = `custom-${Date.now()}`;
    const newReg: CustomRegion = {
      id: newId,
      label: `Copy of ${target.label}`,
      mode: target.mode,
      bbox: [x1 + offset, y1 + offset, x2 + offset, y2 + offset],
      isCustom: true,
      isIgnored: false,
    };
    const nextCustom = [...customRegions, newReg];
    setCustomRegions(nextCustom);
    setSelectedId(newId);
    triggerAutoSync(boxes, nextCustom);
  };

  // Selected item lookup
  const selectedBox = boxes.find((b) => b.id === selectedId);
  const selectedCustom = customRegions.find((c) => c.id === selectedId);
  const activeSelectedItem = selectedBox
    ? { ...selectedBox, isCustom: false }
    : selectedCustom
    ? { ...selectedCustom, isCustom: true, severity: "HIGH" as const }
    : null;

  useEffect(() => {
    if (activeSelectedItem) {
      setTempLabel(activeSelectedItem.label);
      setIsEditingLabel(false);
    }
  }, [selectedId, activeSelectedItem?.label]);

  // All items for sidebar and canvas
  const allSidebarItems = [
    ...boxes.map((b) => ({ ...b, isCustom: false })),
    ...customRegions.map((c) => ({
      id: c.id,
      label: c.label,
      category: "CUSTOM",
      severity: "HIGH" as const,
      bbox: c.bbox,
      mode: c.mode,
      isIgnored: !!c.isIgnored,
      isCustom: true,
    })),
  ];

  const maskedCount = allSidebarItems.filter((i) => !i.isIgnored).length;
  const unmaskedCount = allSidebarItems.filter((i) => i.isIgnored).length;

  return (
    <div className="w-full bg-[#111827] rounded-3xl p-5 sm:p-7 border border-[#1F2937] shadow-2xl space-y-4">
      {/* 1. Top Toolbar (Clean Canvas Header + Add Area + Compare) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2937]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] shrink-0">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">Interactive SafeShare Canvas</h3>
              <span className="text-[10px] font-semibold text-[#22C55E] px-2 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20">
                Direct Click &amp; Drag
              </span>
            </div>
            <p className="text-[11px] text-[#8CA3B8]">
              Click any box to resize, unmask, or rename • Click and drag to protect custom areas
            </p>
          </div>
        </div>

        {/* Action Controls: Add Protection Area + Compare Slider Toggle */}
        <div className="flex items-center gap-2">
          {/* Add Protection Area */}
          <button
            type="button"
            onClick={() => setIsDrawingMode(!isDrawingMode)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isDrawingMode
                ? "bg-[#14B8A6] text-white border-[#14B8A6] shadow-md shadow-[#14B8A6]/30 animate-pulse"
                : "bg-[#090B14] text-[#14B8A6] border-[#14B8A6]/40 hover:bg-[#14B8A6]/10"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{isDrawingMode ? "Drawing Active..." : "Draw Custom Box"}</span>
          </button>

          {/* Compare Slider Toggle */}
          <button
            type="button"
            onClick={() => setShowCompareSlider(!showCompareSlider)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showCompareSlider
                ? "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]"
                : "bg-[#090B14] text-[#8CA3B8] border-[#1F2937] hover:text-white"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Compare</span>
          </button>

          {/* Toggle Sidebar */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-xl bg-[#090B14] border border-[#1F2937] text-[#8CA3B8] hover:text-white transition-colors cursor-pointer"
            title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
          >
            {isSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Floating Contextual Toolbar (Appears when user clicks any box) */}
      {activeSelectedItem && !showCompareSlider && (
        <div className="p-3.5 rounded-2xl bg-[#090B14] border border-[#8B5CF6]/50 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                activeSelectedItem.isIgnored
                  ? "bg-amber-400 shadow-sm shadow-amber-400"
                  : "bg-[#22C55E] shadow-sm shadow-emerald-400 animate-ping"
              }`}
            />
            
            <div className="min-w-0">
              {/* Editable Name / Label */}
              {isEditingLabel ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={tempLabel}
                    onChange={(e) => setTempLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmRename();
                      if (e.key === "Escape") setIsEditingLabel(false);
                    }}
                    placeholder="Enter area name..."
                    className="px-2.5 py-1 rounded-lg bg-[#111827] border border-[#8B5CF6] text-white text-xs font-bold outline-none max-w-[220px]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleConfirmRename}
                    className="p-1 rounded-lg bg-[#8B5CF6] text-white hover:bg-[#7C3AED] transition-colors cursor-pointer"
                    title="Save Name"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingLabel(false)}
                    className="p-1 rounded-lg bg-[#1F2937] text-[#8CA3B8] hover:text-white transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1.5 cursor-pointer group"
                  onClick={() => setIsEditingLabel(true)}
                  title="Click to rename this area"
                >
                  <span className="text-xs font-bold text-white group-hover:text-[#A78BFA] transition-colors truncate max-w-[240px]">
                    {activeSelectedItem.label}
                  </span>
                  <Edit3 className="w-3 h-3 text-[#8CA3B8] group-hover:text-[#A78BFA] shrink-0" />
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded shrink-0 ${
                      activeSelectedItem.isIgnored
                        ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {activeSelectedItem.isIgnored ? "Shown in Document" : "Masked"}
                  </span>
                </div>
              )}
              <p className="text-[10px] text-[#8CA3B8]">
                {activeSelectedItem.isIgnored
                  ? "Area will stay visible in final document • Click 'Mask' to hide"
                  : "Protected area • Choose style or click 'Unmask' to show"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Unmask / Mask Button */}
            <button
              type="button"
              onClick={() => handleToggleMask()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                activeSelectedItem.isIgnored
                  ? "bg-[#22C55E]/20 hover:bg-[#22C55E]/30 border-[#22C55E]/50 text-[#22C55E]"
                  : "bg-amber-950/60 hover:bg-amber-900/80 border-amber-500/40 text-amber-300"
              }`}
            >
              {activeSelectedItem.isIgnored ? (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Mask Area</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Unmask (Show Area)</span>
                </>
              )}
            </button>

            {/* Style Selector Buttons (Active when not ignored) */}
            {!activeSelectedItem.isIgnored && (
              <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-[#1F2937]">
                <button
                  type="button"
                  onClick={() => handleStyleChange("blur")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                    activeSelectedItem.mode === "blur"
                      ? "bg-[#8B5CF6] text-white shadow-sm"
                      : "text-[#8CA3B8] hover:text-white"
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Blur</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStyleChange("pixelate")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                    activeSelectedItem.mode === "pixelate"
                      ? "bg-[#14B8A6] text-white shadow-sm"
                      : "text-[#8CA3B8] hover:text-white"
                  }`}
                >
                  <EyeOff className="w-3 h-3" />
                  <span>Pixelate</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStyleChange("blackout")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                    activeSelectedItem.mode === "blackout"
                      ? "bg-slate-700 text-white shadow-sm"
                      : "text-[#8CA3B8] hover:text-white"
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  <span>Blackout</span>
                </button>
              </div>
            )}

            {/* Duplicate Button */}
            <button
              type="button"
              onClick={handleDuplicate}
              className="p-1.5 rounded-xl bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] text-[#8CA3B8] hover:text-white transition-colors cursor-pointer"
              title="Duplicate Box"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {/* Delete / Remove Button */}
            <button
              type="button"
              onClick={() => handleDelete()}
              className="p-1.5 rounded-xl bg-[#111827] hover:bg-red-950/80 border border-[#1F2937] hover:border-red-500/40 text-[#8CA3B8] hover:text-red-400 transition-colors cursor-pointer"
              title={activeSelectedItem.isCustom ? "Delete Custom Box" : "Unmask (Show Area)"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Deselect */}
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="p-1.5 rounded-xl bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] text-[#8CA3B8] hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Workspace: Canvas + Right-side Detection Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Canvas Area */}
        <div
          ref={containerRef}
          className={`relative flex-1 w-full rounded-2xl bg-[#090B14] border border-[#1F2937] p-4 flex items-center justify-center overflow-hidden min-h-[420px] select-none ${
            isDrawingMode ? "cursor-crosshair" : showCompareSlider ? "cursor-ew-resize" : "cursor-default"
          }`}
          onMouseDown={() => {
            if (showCompareSlider) setIsSliderDragging(true);
          }}
          onTouchMove={(e) => {
            if (showCompareSlider) handleSliderMove(e.touches[0].clientX);
          }}
        >
          {/* Compare Slider Mode */}
          {showCompareSlider ? (
            <div className="relative max-w-full max-h-[500px] inline-block shadow-2xl">
              <img
                src={originalImageUrl}
                alt="Original Document"
                className="max-w-full max-h-[500px] object-contain block rounded-xl border border-[#1F2937]"
              />

              {/* Clipped Redacted Layer */}
              <div
                className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
                style={{
                  clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                }}
              >
                <img
                  src={redactedImageUrl || originalImageUrl}
                  alt="Protected Document"
                  className="w-full h-full object-contain block"
                />
              </div>

              {/* Glowing Purple Divider */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-[#8B5CF6] shadow-[0_0_12px_#8B5CF6] z-10 pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#8B5CF6] text-white border-2 border-white shadow-2xl flex items-center justify-center font-bold text-xs">
                  ↔
                </div>
              </div>
            </div>
          ) : (
            /* Standard Interactive Canvas with SVG Overlays */
            <div className="relative max-w-full max-h-[500px] inline-block shadow-2xl">
              <img
                ref={imageRef}
                src={originalImageUrl}
                alt="Document Preview"
                onLoad={onImageLoad}
                className="max-w-full max-h-[500px] object-contain block rounded-xl"
              />

              {/* Redacted regions preview mask */}
              <svg
                ref={svgRef}
                viewBox={`0 0 ${imageNaturalSize.width} ${imageNaturalSize.height}`}
                className="absolute inset-0 w-full h-full pointer-events-auto"
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
              >
                {/* Visual Masks for each box */}
                {allSidebarItems.map((item) => {
                  const [x1, y1, x2, y2] = item.bbox;
                  const width = x2 - x1;
                  const height = y2 - y1;
                  const isSelected = selectedId === item.id;
                  const isHovered = hoveredId === item.id;
                  const isIgnored = item.isIgnored;

                  // Fill color depends on mode or unmasked state
                  let fill = "rgba(139, 92, 246, 0.4)";
                  if (isIgnored) {
                    fill = "rgba(245, 158, 11, 0.08)";
                  } else if (item.mode === "blackout") {
                    fill = "rgba(17, 24, 39, 0.95)";
                  } else if (item.mode === "pixelate") {
                    fill = "rgba(20, 184, 166, 0.5)";
                  }

                  const strokeColor = isSelected
                    ? isIgnored ? "#F59E0B" : "#8B5CF6"
                    : isHovered
                    ? isIgnored ? "#FBBF24" : "#2DD4BF"
                    : isIgnored
                    ? "rgba(245, 158, 11, 0.6)"
                    : "rgba(139, 92, 246, 0.6)";

                  return (
                    <g
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(item.id);
                      }}
                      onMouseEnter={() => setHoveredId(item.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="cursor-pointer"
                    >
                      {/* Mask Fill */}
                      <rect
                        x={x1}
                        y={y1}
                        width={width}
                        height={height}
                        fill={fill}
                        rx={4}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 3 : 1.5}
                        strokeDasharray={isIgnored ? "4 4" : isSelected ? "4 2" : undefined}
                      />

                      {/* Label badge */}
                      <rect
                        x={x1}
                        y={Math.max(0, y1 - 18)}
                        width={Math.min(140, item.label.length * 7 + (isIgnored ? 40 : 16))}
                        height={16}
                        fill="#090B14"
                        stroke={strokeColor}
                        strokeWidth={0.8}
                        rx={3}
                      />
                      <text
                        x={x1 + 5}
                        y={Math.max(12, y1 - 6)}
                        fill={isIgnored ? "#FBBF24" : "#FFFFFF"}
                        fontSize={9}
                        fontWeight="bold"
                      >
                        {item.label.slice(0, 12)}
                        {isIgnored ? " (Visible)" : ""}
                      </text>

                      {/* Resizing Handles (When Selected) */}
                      {isSelected && (
                        <>
                          <rect
                            x={x1 - 4}
                            y={y1 - 4}
                            width={8}
                            height={8}
                            fill={isIgnored ? "#F59E0B" : "#8B5CF6"}
                            className="cursor-nw-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setActiveDrag({
                                id: item.id,
                                type: "nw",
                                startX: getNaturalCoords(e.clientX, e.clientY)?.x || x1,
                                startY: getNaturalCoords(e.clientX, e.clientY)?.y || y1,
                                startBbox: item.bbox,
                              });
                            }}
                          />
                          <rect
                            x={x2 - 4}
                            y={y1 - 4}
                            width={8}
                            height={8}
                            fill={isIgnored ? "#F59E0B" : "#8B5CF6"}
                            className="cursor-ne-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setActiveDrag({
                                id: item.id,
                                type: "ne",
                                startX: getNaturalCoords(e.clientX, e.clientY)?.x || x2,
                                startY: getNaturalCoords(e.clientX, e.clientY)?.y || y1,
                                startBbox: item.bbox,
                              });
                            }}
                          />
                          <rect
                            x={x1 - 4}
                            y={y2 - 4}
                            width={8}
                            height={8}
                            fill={isIgnored ? "#F59E0B" : "#8B5CF6"}
                            className="cursor-sw-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setActiveDrag({
                                id: item.id,
                                type: "sw",
                                startX: getNaturalCoords(e.clientX, e.clientY)?.x || x1,
                                startY: getNaturalCoords(e.clientX, e.clientY)?.y || y2,
                                startBbox: item.bbox,
                              });
                            }}
                          />
                          <rect
                            x={x2 - 4}
                            y={y2 - 4}
                            width={8}
                            height={8}
                            fill={isIgnored ? "#F59E0B" : "#8B5CF6"}
                            className="cursor-se-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setActiveDrag({
                                id: item.id,
                                type: "se",
                                startX: getNaturalCoords(e.clientX, e.clientY)?.x || x2,
                                startY: getNaturalCoords(e.clientX, e.clientY)?.y || y2,
                                startBbox: item.bbox,
                              });
                            }}
                          />
                        </>
                      )}
                    </g>
                  );
                })}

                {/* Current Drawing Box */}
                {currentDrawBbox && (
                  <rect
                    x={currentDrawBbox[0]}
                    y={currentDrawBbox[1]}
                    width={currentDrawBbox[2] - currentDrawBbox[0]}
                    height={currentDrawBbox[3] - currentDrawBbox[1]}
                    fill="rgba(20, 184, 166, 0.3)"
                    stroke="#14B8A6"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                  />
                )}
              </svg>
            </div>
          )}
        </div>

        {/* 4. Detection Sidebar (Right-Side Drawer showing all items with Mask / Unmask controls) */}
        {isSidebarOpen && (
          <div className="w-full lg:w-80 bg-[#090B14] rounded-2xl p-4 border border-[#1F2937] shadow-xl space-y-3 shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-[#1F2937]">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Detected Areas
                </span>
                <span className="text-[10px] text-[#8CA3B8]">
                  {maskedCount} Masked • {unmaskedCount} Visible
                </span>
              </div>
              <span className="text-[10px] font-bold text-[#22C55E] px-2 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20">
                {maskedCount} Protected
              </span>
            </div>

            <div className="space-y-2 max-h-[390px] overflow-y-auto pr-1">
              {allSidebarItems.map((item) => {
                const isSelected = selectedId === item.id;
                const isIgnored = item.isIgnored;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-[#8B5CF6]/15 border-[#8B5CF6] text-white shadow-sm"
                        : isIgnored
                        ? "bg-[#111827]/60 border-[#1F2937] text-[#8CA3B8] opacity-85 hover:border-amber-500/40"
                        : "bg-[#111827] border-[#1F2937] text-[#8CA3B8] hover:border-[#8B5CF6]/40 hover:text-white"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate text-white flex items-center gap-1.5">
                        <span className="truncate">{item.label}</span>
                        {item.isCustom && (
                          <span className="text-[9px] px-1 rounded bg-[#8B5CF6]/20 text-[#C4B5FD] font-mono shrink-0">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] flex items-center gap-1.5 mt-0.5">
                        {isIgnored ? (
                          <span className="text-amber-400 font-medium flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Visible in document
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <Shield className="w-3 h-3" /> {item.mode} applied
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Toggle Button on card */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleMask(item.id);
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer shrink-0 ${
                        isIgnored
                          ? "bg-[#22C55E]/15 hover:bg-[#22C55E]/25 border-[#22C55E]/40 text-[#22C55E]"
                          : "bg-amber-950/60 hover:bg-amber-900/80 border-amber-500/40 text-amber-300"
                      }`}
                      title={isIgnored ? "Click to mask this area" : "Click to unmask and keep visible"}
                    >
                      {isIgnored ? "Mask" : "Unmask"}
                    </button>
                  </div>
                );
              })}


            </div>
          </div>
        )}
      </div>

      {/* 5. Add Area Modal Popup with User-Written Custom Label + Predefined Presets */}
      {showNewRegionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111827] rounded-3xl p-6 border border-[#1F2937] shadow-2xl max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white">Protect This Area</h4>
              <button
                type="button"
                onClick={() => setShowNewRegionModal(false)}
                className="p-1 rounded-lg text-[#8CA3B8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Predefined Quick Presets */}
              <div>
                <label className="text-[#8CA3B8] block mb-1.5 font-semibold">
                  Predefined Presets (Click to select):
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {["Face", "Signature", "QR Code", "Text", "ID Number", "Secret Key", "Contact Info"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setNewRegionCategory(cat);
                        setRegionCustomLabel(cat);
                      }}
                      className={`p-2 rounded-xl border font-semibold text-center cursor-pointer transition-all ${
                        regionCustomLabel === cat
                          ? "bg-[#8B5CF6]/20 border-[#8B5CF6] text-white shadow-sm"
                          : "bg-[#090B14] border-[#1F2937] text-[#8CA3B8] hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* User-Written Custom Name Input */}
              <div>
                <label className="text-[#8CA3B8] block mb-1.5 font-semibold">
                  Area Name / Label (User-written):
                </label>
                <input
                  type="text"
                  value={regionCustomLabel}
                  onChange={(e) => setRegionCustomLabel(e.target.value)}
                  placeholder="e.g. Passport Photo, Employee Badge, Note..."
                  className="w-full px-3 py-2 rounded-xl bg-[#090B14] border border-[#1F2937] focus:border-[#8B5CF6] text-white text-xs outline-none transition-colors"
                />
                <p className="text-[10px] text-[#8CA3B8] mt-1">
                  You can choose a preset above or type your own custom label.
                </p>
              </div>

              {/* Protection Style */}
              <div>
                <label className="text-[#8CA3B8] block mb-1.5 font-semibold">
                  Protection Style:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["blur", "pixelate", "blackout"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setNewRegionMode(mode)}
                      className={`p-2 rounded-xl border font-semibold capitalize text-center cursor-pointer transition-all ${
                        newRegionMode === mode
                          ? "bg-[#14B8A6]/20 border-[#14B8A6] text-[#14B8A6]"
                          : "bg-[#090B14] border-[#1F2937] text-[#8CA3B8] hover:text-white"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewRegionModal(false)}
                className="px-4 py-2 rounded-xl bg-[#090B14] border border-[#1F2937] text-xs font-semibold text-[#8CA3B8] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmNewRegion}
                className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold text-white shadow-lg shadow-[#8B5CF6]/25 cursor-pointer"
              >
                Apply Protection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
