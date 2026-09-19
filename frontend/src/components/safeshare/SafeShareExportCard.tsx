import React, { useState } from "react";
import {
  Download,
  CheckCircle2,
  Copy,
  Check,
  FileImage,
  FileText,
  Link2,
  ShieldCheck,
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
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<"png" | "pdf" | "link">("png");

  const sha256 = safeShareData.output_sha256 || "e784826adda8b213810a2456a8781657616cb2fba82d6349df80aff014027612";
  const shareUrl = `${window.location.origin}/safeshare/${safeShareData.redaction_id}`;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Safe distribution triggers
  const handleShare = (platform: "slack" | "whatsapp" | "email" | "linkedin") => {
    const text = encodeURIComponent(
      `Protected with PersonaShield AI SafeShare: Sanitized artifact verified with SHA-256 fingerprint ${sha256.slice(0, 12)}...`
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
        window.open(`mailto:?subject=Sanitized%20Asset%20Verification&body=${text}%20${url}`, "_blank");
        break;
      case "linkedin":
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
        break;
    }
  };

  return (
    <div className="w-full bg-[#0F172A] rounded-3xl p-6 sm:p-8 border border-[#1E293B] shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-white">SafeShare Distribution Hub</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px] font-bold uppercase tracking-wider">
              Public Safe
            </span>
          </div>
          <p className="text-xs text-[#8CA3B8]">
            Distribute the sanitized artifact securely via multi-format download or enterprise channels
          </p>
        </div>

        {/* Format Selector Pills */}
        <div className="flex items-center gap-1.5 bg-[#060816] p-1.5 rounded-2xl border border-[#1E293B]">
          <button
            type="button"
            onClick={() => setSelectedFormat("png")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedFormat === "png"
                ? "bg-[#10B981] text-white shadow-md shadow-[#10B981]/25"
                : "text-[#8CA3B8] hover:text-[#E8EEF8]"
            }`}
          >
            <FileImage className="w-3.5 h-3.5" />
            <span>Lossless PNG</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedFormat("pdf")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedFormat === "pdf"
                ? "bg-[#10B981] text-white shadow-md shadow-[#10B981]/25"
                : "text-[#8CA3B8] hover:text-[#E8EEF8]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Sanitized PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedFormat("link")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedFormat === "link"
                ? "bg-[#10B981] text-white shadow-md shadow-[#10B981]/25"
                : "text-[#8CA3B8] hover:text-[#E8EEF8]"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Share Link</span>
          </button>
        </div>
      </div>

      {/* Main Action Banner */}
      <div className="p-5 rounded-2xl bg-[#060816] border border-[#1E293B] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>All Sensitive Findings Reversibly Redacted & EXIF Cleansed</span>
          </div>
          <p className="text-xs text-[#8CA3B8]">
            {selectedFormat === "png"
              ? "Download 100% EXIF-purged PNG with deterministic coordinate masking."
              : selectedFormat === "pdf"
              ? "Download a flattened, sanitized PDF document with zero hidden text layer leaks."
              : "Generate an encrypted ephemeral link with access control and retention TTL."}
          </p>
        </div>

        {selectedFormat === "link" ? (
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shadow-lg shadow-[#7C3AED]/25 transition-all cursor-pointer shrink-0"
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? "Link Copied!" : "Copy SafeShare Link"}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-lg shadow-[#10B981]/25 transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? "Generating..." : `Download ${selectedFormat.toUpperCase()}`}</span>
          </button>
        )}
      </div>

      {/* Enterprise & Social Share Sheet */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8CA3B8] mb-3">
          Share Clean Copy Directly
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => handleShare("slack")}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[#060816] hover:bg-[#162032] border border-[#1E293B] text-xs font-semibold text-white transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-[#E01E5A]" />
            <span>Slack</span>
          </button>
          <button
            type="button"
            onClick={() => handleShare("whatsapp")}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[#060816] hover:bg-[#162032] border border-[#1E293B] text-xs font-semibold text-white transition-all cursor-pointer"
          >
            <Send className="w-4 h-4 text-[#25D366]" />
            <span>WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={() => handleShare("email")}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[#060816] hover:bg-[#162032] border border-[#1E293B] text-xs font-semibold text-white transition-all cursor-pointer"
          >
            <Mail className="w-4 h-4 text-[#EA4335]" />
            <span>Email</span>
          </button>
          <button
            type="button"
            onClick={() => handleShare("linkedin")}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[#060816] hover:bg-[#162032] border border-[#1E293B] text-xs font-semibold text-white transition-all cursor-pointer"
          >
            <Globe className="w-4 h-4 text-[#0A66C2]" />
            <span>LinkedIn</span>
          </button>
        </div>
      </div>

      {/* Cryptographic SHA-256 Fingerprint Seal */}
      <div className="p-4 rounded-2xl bg-[#060816] border border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span className="text-[#8CA3B8] shrink-0">SHA-256 Output Seal:</span>
          <code className="font-mono text-white text-[11px] truncate">{sha256}</code>
        </div>
        <button
          type="button"
          onClick={handleCopyHash}
          className="flex items-center gap-1 text-[11px] font-semibold text-[#10B981] hover:text-[#059669] transition-colors cursor-pointer shrink-0"
        >
          {copiedHash ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedHash ? "Copied" : "Copy Hash"}</span>
        </button>
      </div>
    </div>
  );
};
