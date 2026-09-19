import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ExposureScoreCard } from "../components/report/ExposureScoreCard";
import { ThreatCategoryGrid } from "../components/findings/ThreatCategoryGrid";
import { FindingCard } from "../components/findings/FindingCard";
import { ExposureTimeline } from "../components/report/ExposureTimeline";
import { Button } from "../components/common/Button";
import { getReport } from "../api/report";
import type { IntelligenceReportData } from "../types/api";
import { ArrowRight, ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";

export const ResultsPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<IntelligenceReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scanId) return;

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const report = await getReport(scanId);
        setData(report);
      } catch (err: any) {
        setError(err.message || "Failed to fetch scan results.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [scanId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-4">
        <div className="w-12 h-12 border-3 border-[#A855F7] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#94A3B8]">Loading Cyber Safety Receipt from database...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Unable to Load Receipt</h2>
        <p className="text-xs text-[#94A3B8]">{error || "No report found for this scan session."}</p>
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

  const { receipt, findings, exposure_chains, threat_category_breakdown } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* 1. Exposure Score Hero */}
      <ExposureScoreCard receipt={receipt} />

      {/* 2. Primary CTA Banner -> Proceed to SafeShare */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#A855F7]/15 via-[#121A2E] to-[#14B8A6]/15 border border-[#A855F7]/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#A855F7]/20 border border-[#A855F7]/40 flex items-center justify-center text-[#A855F7] shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">Generate SafeShare Redacted Version</h4>
            <p className="text-xs text-[#94A3B8]">
              Sanitize all {receipt.total_findings} exposed leaks automatically with Gaussian blur, pixelation, or blackout before sharing.
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

      {/* 3. Threat Categories Grid */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-white">Threat Category Breakdown</h3>
        <ThreatCategoryGrid categories={threat_category_breakdown || {}} />
      </div>

      {/* 4. Detected Findings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Detected Findings & Evidence</h3>
            <p className="text-xs text-[#94A3B8]">
              Deterministic findings with masked snippets, explainability reasons, and remediation playbooks
            </p>
          </div>
          <span className="text-xs font-mono text-[#14B8A6] px-2.5 py-1 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/30">
            {findings.length} findings
          </span>
        </div>

        {findings.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#121A2E] border border-[#1E293B] text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-[#22C55E] mx-auto" />
            <div className="text-sm font-semibold text-white">Zero Leaks Detected</div>
            <p className="text-xs text-[#94A3B8]">This digital artifact passed all cybersecurity checks cleanly.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {findings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} />
            ))}
          </div>
        )}
      </div>

      {/* 5. 3-Step Exposure Chains */}
      <ExposureTimeline chains={exposure_chains || {}} />
    </div>
  );
};
