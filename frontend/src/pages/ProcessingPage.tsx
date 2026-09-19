import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProcessingTimeline, type PipelineStage } from "../components/processing/ProcessingTimeline";
import { extractEntities, getEntities } from "../api/extraction";
import { detectExposure } from "../api/findings";
import { generateReport } from "../api/report";
import { Button } from "../components/common/Button";
import { ArrowRight, RefreshCw, AlertCircle } from "lucide-react";

export const ProcessingPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const ranRef = useRef(false);

  const [stages, setStages] = useState<PipelineStage[]>([
    {
      id: "upload",
      name: "Upload & File Integrity",
      endpoint: "POST /api/v1/scan",
      description: "UUID isolation, MIME validation, and SHA-256 binary fingerprinting.",
      state: "completed",
      detail: "Artifact securely buffered in private storage.",
    },
    {
      id: "ocr",
      name: "OCR Extraction Pipeline",
      endpoint: "POST /api/v1/scan/{id}/extract",
      description: "Grayscale preprocessing, contrast enhancement, and Unicode NFKC normalization.",
      state: "pending",
    },
    {
      id: "entities",
      name: "Entity Classification",
      endpoint: "GET /api/v1/scan/{id}/entities",
      description: "Microsoft Presidio and pattern recognition bounding box mapping.",
      state: "pending",
    },
    {
      id: "detect",
      name: "Exposure Intelligence & Scoring",
      endpoint: "POST /api/v1/scan/{id}/detect",
      description: "Compounding risk analysis, severity scoring, and evidence masking.",
      state: "pending",
    },
    {
      id: "report",
      name: "Cyber Safety Receipt Compilation",
      endpoint: "POST /api/v1/scan/{id}/report",
      description: "3-step attack exposure chains, remediation playbooks, and snapshot caching.",
      state: "pending",
    },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const updateStage = (
    id: string,
    updates: Partial<Omit<PipelineStage, "id">>
  ) => {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const runPipeline = async () => {
    if (!scanId) return;
    setError(null);
    setIsCompleted(false);

    try {
      // 1. Upload stage is already verified
      updateStage("upload", { state: "completed" });

      // 2. OCR Extraction
      updateStage("ocr", { state: "running" });
      const extractResult = await extractEntities(scanId);
      updateStage("ocr", {
        state: "completed",
        detail: `Extracted ${extractResult.total_entities} candidate text regions.`,
      });

      // 3. Entity Classification
      updateStage("entities", { state: "running" });
      const entitiesResult = await getEntities(scanId);
      updateStage("entities", {
        state: "completed",
        detail: `Classified ${entitiesResult.total_entities} sensitive entities on canvas.`,
      });

      // 4. Exposure Intelligence & Scoring
      updateStage("detect", { state: "running" });
      const detectResult = await detectExposure(scanId);
      updateStage("detect", {
        state: "completed",
        detail: `Detected ${detectResult.total_findings} exposures • Score: ${detectResult.exposure_score}/100 (${detectResult.risk_level}).`,
      });

      // 5. Cyber Safety Receipt Compilation
      updateStage("report", { state: "running" });
      const reportResult = await generateReport(scanId);
      updateStage("report", {
        state: "completed",
        detail: `Report snapshot compiled with ${Object.keys(reportResult.exposure_chains || {}).length} attack chains.`,
      });

      setIsCompleted(true);

      // Auto-transition to results after 1.5s
      setTimeout(() => {
        navigate(`/results/${scanId}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An error occurred during pipeline execution.");
      // Mark current running stage as error
      setStages((prev) =>
        prev.map((s) => (s.state === "running" ? { ...s, state: "error" } : s))
      );
    }
  };

  useEffect(() => {
    if (!ranRef.current && scanId) {
      ranRef.current = true;
      runPipeline();
    }
  }, [scanId]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
          Cybersecurity Analysis Pipeline
        </h1>
        <p className="text-xs text-[#94A3B8]">
          Executing multi-stage preventive scan on scan session <span className="font-mono text-[#A855F7]">{scanId}</span>
        </p>
      </div>

      {/* Pipeline Timeline */}
      <ProcessingTimeline stages={stages} />

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={runPipeline}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry Pipeline
          </Button>
        </div>
      )}

      {/* Completion CTA */}
      {isCompleted && (
        <div className="p-5 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#22C55E] font-medium">
            Scan completed successfully! Loading Cyber Safety Receipt...
          </div>
          <Button
            type="button"
            variant="primary"
            size="md"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate(`/results/${scanId}`)}
          >
            View Cyber Safety Receipt
          </Button>
        </div>
      )}
    </div>
  );
};
