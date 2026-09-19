import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getReport } from "../api/report";
import { getEntities } from "../api/extraction";
import { CyberSafetyReceiptCard } from "../components/report/CyberSafetyReceiptCard";
import { DetectionCanvas, type VisualizationMode } from "../components/safeshare/DetectionCanvas";
import { ExplainabilityPanel } from "../components/findings/ExplainabilityPanel";
import { ThreatCategoryGrid } from "../components/findings/ThreatCategoryGrid";
import { ExposureTimeline } from "../components/report/ExposureTimeline";
import { Button } from "../components/common/Button";
import { ShieldCheck, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";

export const ResultsPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const [visMode, setVisMode] = useState<VisualizationMode>("detection");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["scan-report", scanId],
    queryFn: () => getReport(scanId!),
    enabled: !!scanId,
  });

  const { data: entitiesData } = useQuery({
    queryKey: ["scan-entities", scanId],
    queryFn: () => getEntities(scanId!),
    enabled: !!scanId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-4">
        <div className="w-12 h-12 border-3 border-[#10B981] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#8CA3B8]">Compiling authoritative Cyber Safety Receipt...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Failed to Load Cyber Safety Receipt</h2>
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
  const categories = receipt?.threat_categories || (data as any).threat_category_breakdown || {};
  const originalUrl = `/api/v1/scan/${scanId}/preview`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* 1. Cyber Safety Receipt Hero Card */}
      {receipt && (
        <CyberSafetyReceiptCard receipt={receipt} evidenceCards={findingsList} />
      )}

      {/* 2. Interactive Detection Overlay on Canvas */}
      {scanId && (
        <DetectionCanvas
          scanId={scanId}
          originalImageUrl={originalUrl}
          findings={findingsList}
          entities={entitiesData || []}
          activeMode={visMode}
          onModeChange={setVisMode}
        />
      )}

      {/* 3. Primary CTA Banner -> Proceed to SafeShare */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#7C3AED]/20 via-[#0F172A] to-[#10B981]/20 border border-[#7C3AED]/40 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] shrink-0 shadow-lg shadow-[#10B981]/10">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-base font-bold text-white">Generate SafeShare Redacted Version</h4>
              <span className="px-2.5 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 text-[10px] font-bold uppercase tracking-wider">
                100% EXIF Purge
              </span>
            </div>
            <p className="text-xs text-[#8CA3B8]">
              Sanitize all {receipt?.total_findings ?? findingsList.length} exposed leaks automatically with Gaussian blur, pixelation, or blackout before sharing.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          rightIcon={<ArrowRight className="w-5 h-5" />}
          onClick={() => navigate(`/safeshare/${scanId}`)}
          className="w-full sm:w-auto shrink-0"
        >
          Proceed to SafeShare
        </Button>
      </div>

      {/* 4. AI Findings & Explainability Playbook */}
      <ExplainabilityPanel findings={findingsList} />

      {/* 5. Threat Categories Breakdown Grid */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-white">Threat Category Breakdown</h3>
        <ThreatCategoryGrid categories={categories} />
      </div>

      {/* 6. Multi-Step Exposure Attack Chains */}
      {chains.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-white">Multi-Step Attack Vectors</h3>
          <ExposureTimeline chains={chains} />
        </div>
      )}
    </div>
  );
};
