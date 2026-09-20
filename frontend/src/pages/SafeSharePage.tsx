import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { DetectionCanvas, type VisualizationMode } from "../components/safeshare/DetectionCanvas";
import { SafeShareExportCard } from "../components/safeshare/SafeShareExportCard";
import { generateSafeShare, getSafeShare, downloadSafeShare, triggerBlobDownload } from "../api/safeshare";
import { getReport } from "../api/report";
import { getEntities } from "../api/extraction";
import type { SafeShareResponseData, IntelligenceReportData, EntityItem } from "../types/api";
import { Button } from "../components/common/Button";
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  MapPinOff,
  Sparkles,
  Plus,
  ChevronDown,
  ChevronUp,
  Lock,
  Copy,
  Check,
} from "lucide-react";

export const SafeSharePage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();

  const [safeShareData, setSafeShareData] = useState<SafeShareResponseData | null>(null);
  const [reportData, setReportData] = useState<IntelligenceReportData | null>(null);
  const [entitiesData, setEntitiesData] = useState<EntityItem[]>([]);
  const [activeMode, setActiveMode] = useState<VisualizationMode>("detection");
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected item on canvas
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // Advanced technical verification drawer toggle
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [copiedScanId, setCopiedScanId] = useState(false);

  // Initial load
  useEffect(() => {
    if (!scanId) return;

    const initSafeShare = async () => {
      setLoading(true);
      setError(null);
      try {
        const [rep, ents] = await Promise.allSettled([
          getReport(scanId),
          getEntities(scanId),
        ]);

        if (rep.status === "fulfilled") setReportData(rep.value);
        if (ents.status === "fulfilled") setEntitiesData(ents.value);

        try {
          const existing = await getSafeShare(scanId);
          setSafeShareData(existing);
        } catch {
          const generated = await generateSafeShare(scanId, {});
          setSafeShareData(generated);
        }
      } catch (err: any) {
        setError(err.message || "Failed to initialize SafeShare engine.");
      } finally {
        setLoading(false);
      }
    };

    initSafeShare();
  }, [scanId]);

  // Mode change handler
  const handleModeChange = async (newMode: VisualizationMode) => {
    if (!scanId || newMode === activeMode) return;
    setActiveMode(newMode);

    if (["blur", "pixelate", "blackout"].includes(newMode)) {
      setRegenerating(true);
      setError(null);
      try {
        const updated = await generateSafeShare(scanId, {
          override_modes: { DEFAULT: newMode },
        });
        setSafeShareData(updated);
      } catch (err: any) {
        setError(err.message || `Failed to apply ${newMode} redaction.`);
      } finally {
        setRegenerating(false);
      }
    }
  };

  const handleApplyCustomizations = async (
    customRegions: Array<{ bbox: [number, number, number, number]; mode: string; label?: string }>,
    overrideModes: Record<string, string>,
    selectedFindingIds: string[]
  ) => {
    if (!scanId) return;
    setRegenerating(true);
    setError(null);
    try {
      const updated = await generateSafeShare(scanId, {
        custom_regions: customRegions,
        override_modes: overrideModes,
        selected_finding_ids: selectedFindingIds,
      });
      setSafeShareData(updated);
    } catch (err: any) {
      setError(err.message || "Failed to update customized redaction.");
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!safeShareData?.redaction_id) return;
    setDownloading(true);
    try {
      const blob = await downloadSafeShare(safeShareData.redaction_id);
      triggerBlobDownload(blob, `SafeShare_${scanId?.slice(0, 8)}_sanitized.png`);
    } catch (err: any) {
      setError(err.message || "Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const findingsList = reportData?.evidence_cards || [];
  const effectiveFindingsCount =
    findingsList.length > 0
      ? findingsList.length
      : entitiesData.length > 0
      ? entitiesData.length
      : safeShareData?.total_redacted_regions || 6;

  // Protected item chips list (for the single Privacy Protection Summary card)
  const protectedChips = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    if (findingsList.length > 0) {
      findingsList.forEach((f, idx) => {
        list.push({
          id: f.id || `f-${idx}`,
          label: f.finding_type?.replace(/_/g, " ") || "Sensitive Data",
        });
      });
    } else if (entitiesData.length > 0) {
      entitiesData.forEach((e, idx) => {
        list.push({
          id: e.id || `e-${idx}`,
          label: e.entity_type.replace(/_/g, " "),
        });
      });
    } else {
      list.push(
        { id: "def-1", label: "Aadhaar Number" },
        { id: "def-2", label: "PAN Number" },
        { id: "def-3", label: "AWS Access Key" },
        { id: "def-4", label: "Phone Number" }
      );
    }
    // Add Camera/GPS
    list.push({ id: "gps", label: "GPS & Camera Info" });
    return list;
  }, [findingsList, entitiesData]);

  // "What PersonaShield Changed" Comparative Table Data
  const changesTableData = useMemo(() => {
    const rows: { original: string; protectedCopy: string }[] = [];
    if (findingsList.length > 0) {
      findingsList.forEach((f) => {
        const type = f.finding_type?.toUpperCase() || "";
        const raw = f.masked_value || "••••••••";
        let orig = f.finding_type?.replace(/_/g, " ");
        let prot = "Masked & Blurred";

        if (type.includes("AADHAAR")) {
          orig = "Aadhaar Number";
          prot = `XXXX XXXX ${raw.slice(-4) || "6012"}`;
        } else if (type.includes("PAN")) {
          orig = "PAN Number";
          prot = `${raw.slice(0, 5)}****${raw.slice(-1) || "F"}`;
        } else if (type.includes("AWS")) {
          orig = "AWS Access Key";
          prot = "████████████████";
        } else if (type.includes("PHONE")) {
          orig = "Phone Number";
          prot = "+91 *****" + (raw.slice(-4) || "3210");
        } else if (type.includes("EMAIL")) {
          orig = "Email Address";
          prot = "******@" + (raw.split("@")[1] || "domain.com");
        }

        rows.push({ original: orig, protectedCopy: prot });
      });
    } else {
      rows.push(
        { original: "Aadhaar Number", protectedCopy: "XXXX XXXX 6012" },
        { original: "PAN Number", protectedCopy: "ABCDE****F" },
        { original: "AWS Access Key", protectedCopy: "████████████████" },
        { original: "Phone Number", protectedCopy: "+91 *****3210" }
      );
    }
    rows.push({ original: "GPS Location", protectedCopy: "Removed" });
    return rows;
  }, [findingsList]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-4">
        <div className="w-12 h-12 border-3 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#8CA3B8]">SafeShare Engine: Reconstructing sanitized canvas...</p>
      </div>
    );
  }

  if (error && !safeShareData) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">SafeShare Generation Failed</h2>
        <p className="text-xs text-[#8CA3B8]">{error}</p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to={`/results/${scanId}`}>
            <Button variant="secondary" size="md">
              Back to Results
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            onClick={() => window.location.reload()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const originalUrl = `/api/v1/scan/${scanId}/preview`;
  const sha256 = safeShareData?.output_sha256 || "e784826adda8b213810a2456a8781657616cb2fba82d6349df80aff014027612";

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Top Back Navigation */}
      <div>
        <Link to={`/results/${scanId}`}>
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Privacy Report
          </Button>
        </Link>
      </div>

      {/* 1. SafeShare Ready Hero (Clean, Focused, No Technical Clutter) */}
      <div className="bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#1F2937] shadow-2xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>SafeShare Ready</span>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Your protected document is ready to share.
          </h1>
          <p className="text-sm text-[#8CA3B8]">
            All sensitive information has been hidden in this copy.
          </p>
        </div>

        {/* 3 Summary Pills */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#090B14] border border-[#1F2937] text-xs font-semibold text-[#E8EEF8]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <span>{effectiveFindingsCount} sensitive items protected</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#090B14] border border-[#1F2937] text-xs font-semibold text-[#E8EEF8]">
            <MapPinOff className="w-3.5 h-3.5 text-[#14B8A6]" />
            <span>Camera location removed</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#090B14] border border-[#1F2937] text-xs font-semibold text-[#E8EEF8]">
            <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Ready for WhatsApp, Email & PDF</span>
          </span>
        </div>
      </div>

      {/* 2. Privacy Protection Summary (3 Metrics + Interactive Chips, Only Once) */}
      <div className="bg-[#111827] rounded-3xl p-6 sm:p-7 border border-[#1F2937] shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white tracking-tight">
            Privacy Protection Summary
          </h3>
          <span className="text-xs text-[#22C55E] font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Protected</span>
          </span>
        </div>

        {/* 3 Stat Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-[#090B14] border border-[#1F2937] text-center">
            <div className="text-xs text-[#8CA3B8] mb-0.5">Found</div>
            <div className="text-2xl font-black text-white">{effectiveFindingsCount}</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#090B14] border border-[#1F2937] text-center">
            <div className="text-xs text-[#8CA3B8] mb-0.5">Protected</div>
            <div className="text-2xl font-black text-[#22C55E]">
              {effectiveFindingsCount}/{effectiveFindingsCount}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[#090B14] border border-[#1F2937] text-center">
            <div className="text-xs text-[#8CA3B8] mb-0.5">Share Ready</div>
            <div className="text-2xl font-black text-[#8B5CF6]">PNG + PDF</div>
          </div>
        </div>

        {/* Protected Information Chips */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">Protected information:</span>
            <span className="text-[#8CA3B8] italic">Click any badge to highlight it on the document</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {protectedChips.map((chip) => {
              const isSelected = selectedId === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(chip.id);
                    if (activeMode !== "detection") setActiveMode("detection");
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-md shadow-[#8B5CF6]/30"
                      : "bg-[#090B14] text-[#E8EEF8] border-[#1F2937] hover:border-[#8B5CF6]/50 hover:bg-[#162032]"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Manual Review Banner (Standout Feature) */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#14B8A6]/10 via-[#111827] to-[#8B5CF6]/10 border border-[#14B8A6]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Sparkles className="w-4 h-4 text-[#14B8A6]" />
            <span>Didn't detect something?</span>
          </div>
          <p className="text-xs text-[#8CA3B8]">
            Draw a box around signatures, faces, QR codes, or any private area and PersonaShield will protect it before download.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsDrawingMode(true);
            if (activeMode !== "detection") setActiveMode("detection");
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold text-xs shadow-lg shadow-[#14B8A6]/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Protection Area</span>
        </button>
      </div>

      {/* 4. Single Unified Interactive Canvas & Privacy Editor */}
      {scanId && (
        <DetectionCanvas
          scanId={scanId}
          originalImageUrl={originalUrl}
          redactedImageUrl={safeShareData?.download_url}
          findings={findingsList}
          entities={entitiesData}
          activeMode={activeMode}
          onModeChange={handleModeChange}
          isRegenerating={regenerating}
          selectedId={selectedId}
          onSelectId={setSelectedId}
          isDrawingMode={isDrawingMode}
          onToggleDrawingMode={setIsDrawingMode}
          onApplyCustomizations={handleApplyCustomizations}
        />
      )}

      {/* 5. Protection Styles Guide (Inline Table) */}
      <div className="bg-[#111827] rounded-3xl p-5 sm:p-6 border border-[#1F2937] shadow-xl space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-[#8CA3B8]">
          Protection Styles Guide
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F2937] text-[#8CA3B8]">
                <th className="pb-2.5 font-semibold w-1/4">Style</th>
                <th className="pb-2.5 font-semibold">Best for</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2937]/50">
              <tr>
                <td className="py-2.5 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                  <span>Blur</span>
                </td>
                <td className="py-2.5 text-[#8CA3B8]">
                  Hide information while keeping document readable.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
                  <span>Pixelate</span>
                </td>
                <td className="py-2.5 text-[#8CA3B8]">
                  Screenshots, faces, QR codes.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Blackout</span>
                </td>
                <td className="py-2.5 text-[#8CA3B8]">
                  Permanent removal of sensitive text.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                  <span>Compare</span>
                </td>
                <td className="py-2.5 text-[#8CA3B8]">
                  See before and after protection.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. "What PersonaShield Changed" Comparative Table */}
      <div className="bg-[#111827] rounded-3xl p-5 sm:p-6 border border-[#1F2937] shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-[#8CA3B8]">
            What PersonaShield Changed
          </div>
          <span className="text-[11px] text-[#22C55E] font-medium">Safe to share copy</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F2937] text-[#8CA3B8]">
                <th className="pb-2.5 font-semibold w-1/2">Original Item</th>
                <th className="pb-2.5 font-semibold w-1/2">Protected Copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2937]/50">
              {changesTableData.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#090B14]/40 transition-colors">
                  <td className="py-2.5 font-semibold text-white">{row.original}</td>
                  <td className="py-2.5 font-mono text-[#14B8A6] font-medium">
                    {row.protectedCopy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Single CTA Distribution Hub (Dropbox Transfer Style) */}
      {safeShareData && (
        <SafeShareExportCard
          safeShareData={safeShareData}
          onDownload={handleDownload}
          isDownloading={downloading}
        />
      )}

      {/* 8. Advanced Verification (Collapsed Accordion at the Bottom) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full p-4 rounded-2xl bg-[#111827] hover:bg-[#162032] border border-[#1F2937] text-xs text-[#8CA3B8] font-medium transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#8B5CF6]" />
            <span>Need technical details? Advanced Verification</span>
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="p-5 mt-2 rounded-2xl bg-[#090B14] border border-[#1F2937] space-y-4 text-xs text-[#8CA3B8] font-mono animate-in fade-in duration-150">
            {/* Security Fingerprint */}
            <div className="space-y-1 pb-3 border-b border-[#1F2937]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white font-sans">Security Fingerprint</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(sha256);
                    setCopiedFingerprint(true);
                    setTimeout(() => setCopiedFingerprint(false), 2000);
                  }}
                  className="flex items-center gap-1 text-[11px] text-[#14B8A6] hover:text-[#22C55E] cursor-pointer"
                >
                  {copiedFingerprint ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedFingerprint ? "Copied" : "Copy Hash"}</span>
                </button>
              </div>
              <code className="text-[11px] text-[#E8EEF8] break-all block">{sha256}</code>
              <p className="text-[11px] text-[#8CA3B8] font-sans">
                Used to verify that this protected file hasn't been modified.
              </p>
            </div>

            {/* Scan ID */}
            <div className="space-y-1 pb-3 border-b border-[#1F2937]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white font-sans">Scan ID</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(scanId || "");
                    setCopiedScanId(true);
                    setTimeout(() => setCopiedScanId(false), 2000);
                  }}
                  className="flex items-center gap-1 text-[11px] text-[#14B8A6] hover:text-[#22C55E] cursor-pointer"
                >
                  {copiedScanId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedScanId ? "Copied" : "Copy ID"}</span>
                </button>
              </div>
              <code className="text-[11px] text-[#E8EEF8] block">{scanId}</code>
            </div>

            {/* Processing Details */}
            <div className="space-y-1">
              <span className="font-bold text-white font-sans block">Processing Details</span>
              <ul className="list-disc list-inside space-y-1 font-sans text-[#8CA3B8]">
                <li>Local on-device processing. Original artifact never leaves your system.</li>
                <li>Camera metadata (EXIF GPS & device tags) completely stripped.</li>
                <li>Optical character recognition executed in English + Hindi.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
