import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { SafeShareComparison } from "../components/safeshare/SafeShareComparison";
import { DownloadSafeShareCard } from "../components/safeshare/DownloadSafeShareCard";
import { generateSafeShare, getSafeShare } from "../api/safeshare";
import type { SafeShareResponseData } from "../types/api";
import { Button } from "../components/common/Button";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";

export const SafeSharePage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();

  const [safeShareData, setSafeShareData] = useState<SafeShareResponseData | null>(null);
  const [activeMode, setActiveMode] = useState<"blur" | "pixelate" | "blackout">("blur");
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load: generate or retrieve existing
  useEffect(() => {
    if (!scanId) return;

    const initSafeShare = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try getting existing first
        try {
          const existing = await getSafeShare(scanId);
          setSafeShareData(existing);
        } catch {
          // If not yet generated, generate with default blur
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

  // Mode change handler (re-generate with chosen style)
  const handleModeChange = async (newMode: "blur" | "pixelate" | "blackout") => {
    if (!scanId || newMode === activeMode) return;
    setActiveMode(newMode);
    setRegenerating(true);
    setError(null);

    try {
      // Apply chosen mode as universal override
      const updated = await generateSafeShare(scanId, {
        override_modes: { DEFAULT: newMode },
      });
      setSafeShareData(updated);
    } catch (err: any) {
      setError(err.message || `Failed to apply ${newMode} redaction.`);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-4">
        <div className="w-12 h-12 border-3 border-[#14B8A6] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#94A3B8]">SafeShare Engine: Reconstructing sanitized canvas...</p>
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
        <p className="text-xs text-[#94A3B8]">{error}</p>
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Top navigation back */}
      <div className="flex items-center justify-between">
        <Link to={`/results/${scanId}`}>
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Cyber Safety Receipt
          </Button>
        </Link>
        <div className="text-xs font-mono text-[#94A3B8]">
          Scan ID: {scanId?.slice(0, 8)}...
        </div>
      </div>

      {/* SafeShare Comparison / Preview */}
      {safeShareData && (
        <SafeShareComparison
          safeShareData={safeShareData}
          activeMode={activeMode}
          onModeChange={handleModeChange}
          isRegenerating={regenerating}
        />
      )}

      {/* Download Card */}
      {safeShareData && (
        <DownloadSafeShareCard redactionId={safeShareData.redaction_id} />
      )}
    </div>
  );
};
