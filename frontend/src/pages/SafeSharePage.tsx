import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DetectionCanvas, type VisualizationMode } from "../components/safeshare/DetectionCanvas";
import { SafeShareComparison } from "../components/safeshare/SafeShareComparison";
import { SafeShareExportCard } from "../components/safeshare/SafeShareExportCard";
import { generateSafeShare, getSafeShare, downloadSafeShare, triggerBlobDownload } from "../api/safeshare";
import { getReport } from "../api/report";
import { getEntities } from "../api/extraction";
import type { SafeShareResponseData, IntelligenceReportData, EntityItem } from "../types/api";
import { Button } from "../components/common/Button";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";

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

  // Initial load
  useEffect(() => {
    if (!scanId) return;

    const initSafeShare = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load report and entities in parallel
        const [rep, ents] = await Promise.allSettled([
          getReport(scanId),
          getEntities(scanId),
        ]);

        if (rep.status === "fulfilled") setReportData(rep.value);
        if (ents.status === "fulfilled") setEntitiesData(ents.value);

        // Try getting existing SafeShare, otherwise generate
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

    // If switching to backend redaction mode, trigger generation with mode override
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-4">
        <div className="w-12 h-12 border-3 border-[#10B981] border-t-transparent rounded-full animate-spin" />
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
  const findingsList = reportData?.evidence_cards || [];
  const findingsCount = findingsList.length > 0 ? findingsList.length : entitiesData.length;
  const riskLevel = reportData?.receipt?.risk_level || "CRITICAL";
  const detectedTypes = [
    ...new Set([
      ...findingsList.map((f) => f.finding_type?.replace(/_/g, " ")),
      ...entitiesData.map((e) => e.entity_type?.replace(/_/g, " ")),
    ]),
  ].filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Top navigation back */}
      <div className="flex items-center justify-between">
        <Link to={`/results/${scanId}`}>
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Cyber Safety Receipt
          </Button>
        </Link>
        <div className="text-xs font-mono text-[#8CA3B8]">
          Scan ID: <span className="text-white">{scanId?.slice(0, 8)}...</span>
        </div>
      </div>

      {/* 1. Interactive Detection Canvas with Bounding Box Overlay & 5 Modes */}
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
        />
      )}

      {/* 2. Cyber Safety Summary & Redaction Audit */}
      {safeShareData && (
        <SafeShareComparison
          safeShareData={safeShareData}
          activeMode={activeMode}
          onModeChange={handleModeChange}
          isRegenerating={regenerating}
          findingsCount={findingsCount}
          riskLevel={riskLevel}
          detectedTypes={detectedTypes}
        />
      )}

      {/* 3. SafeShare Multi-Channel Distribution Hub */}
      {safeShareData && (
        <SafeShareExportCard
          safeShareData={safeShareData}
          onDownload={handleDownload}
          isDownloading={downloading}
        />
      )}
    </div>
  );
};
