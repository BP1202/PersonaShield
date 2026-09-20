import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getReport } from "../api/report";
import { getSafeShare, generateSafeShare } from "../api/safeshare";
import { CyberSafetyReceiptCard } from "../components/report/CyberSafetyReceiptCard";
import { PrivacyCompareSection } from "../components/report/PrivacyCompareSection";
import { ReportActionHub } from "../components/report/ReportActionHub";
import { ExplainabilityPanel } from "../components/findings/ExplainabilityPanel";
import { Button } from "../components/common/Button";
import { RefreshCw, AlertCircle } from "lucide-react";

export const ResultsPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();

  // Fetch report data
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["scan-report", scanId],
    queryFn: () => getReport(scanId!),
    enabled: !!scanId,
  });

  // Fetch or ensure SafeShare sanitized artifact is generated
  const { data: safeShareData } = useQuery({
    queryKey: ["scan-safeshare", scanId],
    queryFn: async () => {
      try {
        return await getSafeShare(scanId!);
      } catch {
        return await generateSafeShare(scanId!, {});
      }
    },
    enabled: !!scanId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-4">
        <div className="w-12 h-12 border-3 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#8CA3B8]">Inspecting document and preparing privacy report...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Failed to Load Privacy Report</h2>
        <p className="text-xs text-[#8CA3B8]">{error?.message || "Report could not be retrieved."}</p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to="/">
            <Button variant="secondary" size="md">
              Start New Scan
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

  const receipt = data.receipt;
  const findingsList = data.evidence_cards || (data as any).findings || [];
  const chains = data.exposure_chains || [];
  const originalUrl = `/api/v1/scan/${scanId}/preview`;
  const sanitizedUrl = safeShareData?.download_url;

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* 1. Hero Decision Card ("One Decision Card") + 2. Bento Info Grid + 3. Risk Meter */}
      {receipt && (
        <CyberSafetyReceiptCard
          receipt={receipt}
          evidenceCards={findingsList}
          scanId={scanId}
        />
      )}

      {/* 4. Before / After Privacy Comparison with Heatmap & Destination Presets */}
      {scanId && (
        <PrivacyCompareSection
          scanId={scanId}
          originalImageUrl={originalUrl}
          redactedImageUrl={sanitizedUrl}
          evidenceCards={findingsList}
        />
      )}

      {/* 4. Primary Action Hub + Download Safety Report (PDF) */}
      {receipt && (
        <ReportActionHub
          scanId={scanId!}
          receipt={receipt}
          evidenceCards={findingsList}
          safeShareData={safeShareData}
        />
      )}

      {/* 6. Privacy Insights (Plain English Cards + Collapsed Attack Vectors Accordion) */}
      <ExplainabilityPanel findings={findingsList} chains={chains} />
    </div>
  );
};
