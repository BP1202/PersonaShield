import React, { useState } from "react";
import {
  Check,
  FileImage,
  FileText,
  Link2,
  Send,
  MessageSquare,
  Mail,
  Globe,
} from "lucide-react";
import type { SafeShareResponseData } from "../../types/api";

interface SafeShareExportCardProps {
  safeShareData: SafeShareResponseData;
  onDownload: () => void;
  isDownloading?: boolean;
}

export const SafeShareExportCard: React.FC<SafeShareExportCardProps> = ({
  safeShareData,
  onDownload,
  isDownloading = false,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const shareUrl = `${window.location.origin}/safeshare/${safeShareData.redaction_id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = (platform: "slack" | "whatsapp" | "email" | "linkedin") => {
    const text = encodeURIComponent(
      `Protected with PersonaShield: Sanitized copy ready for safe sharing.`
    );
    const url = encodeURIComponent(shareUrl);

    switch (platform) {
      case "slack":
        window.open(`https://slack.com/app_redirect?channel=general`, "_blank");
        break;
      case "whatsapp":
        window.open(`https://api.whatsapp.com/send?text=${text}%20${url}`, "_blank");
        break;
      case "email":
        window.open(`mailto:?subject=Sanitized%20Document&body=${text}%20${url}`, "_blank");
        break;
      case "linkedin":
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
        break;
    }
  };

  return (
    <div className="w-full bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#1F2937] shadow-2xl space-y-6">
      {/* 1. Header */}
      <div className="space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#22C55E]">
          Ready to Share
        </span>
        <h3 className="text-xl font-bold text-white tracking-tight">
          Download your protected document
        </h3>
        <p className="text-xs text-[#8CA3B8]">
          This copy is safe for social media, messaging, and email.
        </p>
      </div>

      {/* 2. Big Action Buttons: PNG | PDF | Copy Link */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onDownload}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-sm shadow-lg shadow-[#22C55E]/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <FileImage className="w-4 h-4" />
          <span>{isDownloading ? "Generating..." : "Download PNG"}</span>
        </button>

        <button
          type="button"
          onClick={onDownload}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-[#090B14] hover:bg-[#162032] border border-[#1F2937] text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          <FileText className="w-4 h-4 text-[#8B5CF6]" />
          <span>Download PDF</span>
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-[#090B14] hover:bg-[#162032] border border-[#1F2937] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
        >
          {copiedLink ? <Check className="w-4 h-4 text-[#22C55E]" /> : <Link2 className="w-4 h-4 text-[#14B8A6]" />}
          <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
        </button>
      </div>

      {/* 3. Share Directly */}
      <div className="pt-2 border-t border-[#1F2937]">
        <div className="text-xs font-semibold text-[#8CA3B8] mb-3">Share directly:</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => handleShare("whatsapp")}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#090B14] hover:bg-[#162032] border border-[#1F2937] text-xs font-semibold text-white transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-[#25D366]" />
            <span>WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={() => handleShare("email")}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#090B14] hover:bg-[#162032] border border-[#1F2937] text-xs font-semibold text-white transition-all cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-[#EA4335]" />
            <span>Email</span>
          </button>
          <button
            type="button"
            onClick={() => handleShare("slack")}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#090B14] hover:bg-[#162032] border border-[#1F2937] text-xs font-semibold text-white transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#E01E5A]" />
            <span>Slack</span>
          </button>
          <button
            type="button"
            onClick={() => handleShare("linkedin")}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#090B14] hover:bg-[#162032] border border-[#1F2937] text-xs font-semibold text-white transition-all cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#0A66C2]" />
            <span>LinkedIn</span>
          </button>
        </div>
      </div>
    </div>
  );
};
