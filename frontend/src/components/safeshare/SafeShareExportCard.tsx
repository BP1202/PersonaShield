import React from "react";
import { FileImage, FileText, ShieldCheck } from "lucide-react";
import type { SafeShareResponseData } from "../../types/api";

interface SafeShareExportCardProps {
  safeShareData: SafeShareResponseData;
  onDownload: () => void;
  isDownloading?: boolean;
  onDownloadTechnicalPdf?: () => void;
}

export const SafeShareExportCard: React.FC<SafeShareExportCardProps> = ({
  onDownload,
  isDownloading = false,
  onDownloadTechnicalPdf,
}) => {
  return (
    <div className="w-full bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#1F2937] shadow-2xl space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>SafeShare Ready</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          Download Protected Document
        </h3>
        <p className="text-xs sm:text-sm text-[#8CA3B8]">
          Choose your desired file format below to download your protected copy.
        </p>
      </div>

      {/* Action Buttons: Only Image Format and PDF Format */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Download Image Format */}
        <button
          type="button"
          onClick={onDownload}
          disabled={isDownloading}
          className="flex items-center justify-between p-5 rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold shadow-lg shadow-[#22C55E]/20 transition-all cursor-pointer disabled:opacity-50 group hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-black/20 flex items-center justify-center">
              <FileImage className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm sm:text-base font-extrabold">
                {isDownloading ? "Generating..." : "Download Image (.PNG)"}
              </div>
              <div className="text-xs text-emerald-100 font-normal">
                Clean, sanitized image format
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-black/20">
            Image
          </span>
        </button>

        {/* 2. Download PDF Format */}
        <button
          type="button"
          onClick={onDownloadTechnicalPdf || onDownload}
          disabled={isDownloading}
          className="flex items-center justify-between p-5 rounded-2xl bg-[#090B14] hover:bg-[#162032] border border-[#1F2937] text-white font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 group hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#8B5CF6]" />
            </div>
            <div className="text-left">
              <div className="text-sm sm:text-base font-extrabold">
                Download Report (.PDF)
              </div>
              <div className="text-xs text-[#8CA3B8] font-normal">
                Official privacy protection report
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#8B5CF6]/20 text-[#C4B5FD]">
            PDF
          </span>
        </button>
      </div>
    </div>
  );
};
