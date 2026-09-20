import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DetectionCanvas } from "../components/safeshare/DetectionCanvas";
import { SafeShareExportCard } from "../components/safeshare/SafeShareExportCard";
import { generateSafeShare, getSafeShare, downloadSafeShare, triggerBlobDownload } from "../api/safeshare";
import { getReport } from "../api/report";
import { getEntities } from "../api/extraction";
import { generatePrivacyReportPdf } from "../utils/generatePrivacyReportPdf";
import type { SafeShareResponseData, IntelligenceReportData, EntityItem } from "../types/api";
import { Button } from "../components/common/Button";
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const SafeSharePage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();

  const [safeShareData, setSafeShareData] = useState<SafeShareResponseData | null>(null);
  const [reportData, setReportData] = useState<IntelligenceReportData | null>(null);
  const [entitiesData, setEntitiesData] = useState<EntityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected item on canvas
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);


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

  // Technical PDF audit generation -> Consumer-friendly Privacy Protection Report
  const handleDownloadTechnicalPdf = () => {
    if (!scanId) return;
    generatePrivacyReportPdf({
      scanId,
      receipt: reportData?.receipt,
      evidenceCards: reportData?.evidence_cards || [],
    });
  };

  const findingsList = reportData?.evidence_cards || [];
  const effectiveFindingsCount =
    findingsList.length > 0
      ? findingsList.length
      : entitiesData.length > 0
      ? entitiesData.length
      : safeShareData?.total_redacted_regions ?? 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-4">
        <div className="w-12 h-12 border-3 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#8CA3B8]">SafeShare Engine: Preparing sanitized canvas...</p>
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

      {/* SECTION 1: SUCCESS HERO (No duplicated summary sections!) */}
      <div className="bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#1F2937] shadow-2xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>SafeShare Ready</span>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Your document is now safe to share.
          </h1>
          <p className="text-sm text-[#8CA3B8]">
            All detected sensitive information has been protected in this copy.
          </p>
        </div>

        {/* Clean Summary Pills */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#090B14] border border-[#1F2937] text-xs font-semibold text-[#E8EEF8]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <span>{effectiveFindingsCount} sensitive items protected</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#090B14] border border-[#1F2937] text-xs font-semibold text-[#E8EEF8]">
            <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Image & PDF formats ready</span>
          </span>

        </div>
      </div>

      {/* SECTION 2: INTERACTIVE EDITOR (Canvas + Sidebar only) */}
      {scanId && (
        <DetectionCanvas
          scanId={scanId}
          originalImageUrl={originalUrl}
          redactedImageUrl={safeShareData?.download_url}
          findings={findingsList}
          entities={entitiesData}
          isRegenerating={regenerating}
          selectedId={selectedId}
          onSelectId={setSelectedId}
          isDrawingMode={isDrawingMode}
          onToggleDrawingMode={setIsDrawingMode}
          onApplyCustomizations={handleApplyCustomizations}
        />
      )}

      {/* SECTION 3: DOWNLOAD & SHARE (Single CTA card) */}
      {safeShareData && (
        <SafeShareExportCard
          safeShareData={safeShareData}
          onDownload={handleDownload}
          isDownloading={downloading}
          onDownloadTechnicalPdf={handleDownloadTechnicalPdf}
        />
      )}

    </div>
  );
};
