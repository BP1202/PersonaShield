import React, { useState } from "react";
import { Download, FileText, ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { downloadSafeShare, triggerBlobDownload } from "../../api/safeshare";
import { generatePrivacyReportPdf } from "../../utils/generatePrivacyReportPdf";
import type { CyberSafetyReceipt, EvidenceCardData, SafeShareResponseData } from "../../types/api";

interface ReportActionHubProps {
  scanId: string;
  receipt: CyberSafetyReceipt;
  evidenceCards?: EvidenceCardData[];
  safeShareData?: SafeShareResponseData | null;
}

export const ReportActionHub: React.FC<ReportActionHubProps> = ({
  scanId,
  receipt,
  evidenceCards = [],
  safeShareData,
}) => {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);

  // Download sanitized PNG directly
  const handleDownloadPng = async () => {
    if (!safeShareData?.redaction_id) {
      navigate(`/safeshare/${scanId}`);
      return;
    }
    setIsDownloading(true);
    try {
      const blob = await downloadSafeShare(safeShareData.redaction_id);
      triggerBlobDownload(blob, `SafeShare_${scanId.slice(0, 8)}_clean.png`);
    } catch {
      navigate(`/safeshare/${scanId}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Generate consumer-friendly 2-page Privacy Protection Report PDF
  const handleDownloadPdf = () => {
    generatePrivacyReportPdf({
      scanId,
      receipt,
      evidenceCards,
    });
  };

  return (
    <div className="w-full bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#1F2937] shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-[#22C55E]" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Ready to Share Safely
            </h3>
          </div>
          <p className="text-xs text-[#8CA3B8]">
            Download the sanitized image or fine-tune privacy areas in the SafeShare editor.
          </p>
        </div>

        <span className="text-xs font-semibold text-[#22C55E] px-3 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 self-start sm:self-auto">
          Sanitized Copy Ready
        </span>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Download Image Format (.PNG) */}
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#22C55E]/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? "Downloading..." : "Download Image (.PNG)"}</span>
        </button>

        {/* 2. Download Report Format (.PDF) */}
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-[#090B14] hover:bg-[#162032] border border-[#1F2937] text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
        >
          <FileText className="w-4 h-4 text-[#8B5CF6]" />
          <span>Download Report (.PDF)</span>
        </button>

        {/* 3. Open SafeShare Editor */}
        <button
          type="button"
          onClick={() => navigate(`/safeshare/${scanId}`)}
          className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#8B5CF6]/20 transition-all cursor-pointer"
        >
          <span>SafeShare Editor</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
