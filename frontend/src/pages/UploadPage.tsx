import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCard } from "../components/upload/UploadCard";
import { SupportedFormats } from "../components/upload/SupportedFormats";
import { SecurityInfoBanner } from "../components/upload/SecurityInfoBanner";
import { uploadScan } from "../api/scan";
import { Sparkles } from "lucide-react";

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const data = await uploadScan(file);
      navigate(`/processing/${data.scan_id}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Hero title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#A855F7]/10 border border-[#A855F7]/30 text-[#A855F7] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Scan Once. Share Safely.</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Prevent Accidental Digital Information Exposure
        </h1>
        <p className="text-sm text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
          Ingest screenshots, receipts, invoices, and documents. Automatically detect leaked credentials,
          secrets, and PII, and generate secure SafeShare redacted copies.
        </p>
      </div>

      {/* Main Drag-and-Drop Uploader */}
      <UploadCard onUpload={handleUpload} isLoading={isUploading} />

      {/* Supported formats */}
      <SupportedFormats />

      {/* Security Info Banner */}
      <SecurityInfoBanner />
    </div>
  );
};
