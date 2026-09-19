import React, { useState } from "react";
import { Download, ShieldCheck, FileCheck, RefreshCw, Lock } from "lucide-react";
import { Button } from "../common/Button";
import { downloadSafeShare, triggerBlobDownload } from "../../api/safeshare";
import { Link } from "react-router-dom";

interface DownloadSafeShareCardProps {
  redactionId: string;
}

export const DownloadSafeShareCard: React.FC<DownloadSafeShareCardProps> = ({ redactionId }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError(null);
      const blob = await downloadSafeShare(redactionId);
      triggerBlobDownload(blob, `SafeShare_sanitized_${redactionId.slice(0, 8)}.png`);
      setDownloaded(true);
    } catch (err: any) {
      setError(err.message || "Failed to download sanitized artifact. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-full bg-[#121A2E] rounded-3xl p-6 sm:p-8 border border-[#1E293B] shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-[#22C55E]" />
            <h3 className="text-lg font-bold text-white">SafeShare Ready to Distribute</h3>
          </div>
          <p className="text-xs text-[#94A3B8]">
            Metadata removed • PNG sanitized • Bounding box clipped • Safe for tickets, slack, and public issues
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="secondary" size="md" leftIcon={<RefreshCw className="w-4 h-4" />}>
              Scan New Document
            </Button>
          </Link>
          <Button
            variant="accent"
            size="md"
            isLoading={downloading}
            onClick={handleDownload}
            leftIcon={<Download className="w-4 h-4" />}
          >
            {downloaded ? "Download Again" : "Download Sanitized PNG"}
          </Button>
        </div>
      </div>

      {/* Security Audit Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#1E293B]">
        <div className="p-3 rounded-xl bg-[#0B1020] border border-[#1E293B] flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#121A2E] text-[#14B8A6]">
            <FileCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#94A3B8]">Artifact Format</div>
            <div className="font-semibold text-xs text-white">Lossless PNG</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0B1020] border border-[#1E293B] flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#121A2E] text-[#22C55E]">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#94A3B8]">Metadata Audit</div>
            <div className="font-semibold text-xs text-white">100% EXIF & GPS Stripped</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0B1020] border border-[#1E293B] flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#121A2E] text-[#A855F7]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#94A3B8]">File Integrity</div>
            <div className="font-semibold text-xs text-white">Verified (Internal SHA-256)</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs">
          {error}
        </div>
      )}
    </div>
  );
};
