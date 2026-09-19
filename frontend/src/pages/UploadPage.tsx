import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCard } from "../components/upload/UploadCard";
import { SupportedFormats } from "../components/upload/SupportedFormats";
import { SecurityInfoBanner } from "../components/upload/SecurityInfoBanner";
import { uploadScan } from "../api/scan";
import { Sparkles, FileText } from "lucide-react";

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

  // 1-Click Sample Ingestion for instant demo & judge evaluation
  const handleTrySample = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clean white document background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 1000, 400);

    // Render clear black text
    ctx.fillStyle = "#000000";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("AWS Key: AKIAIOSFODNN7EXAMPLE", 50, 70);
    ctx.fillText("Aadhaar: 3675 9834 6012", 50, 150);
    ctx.fillText("PAN Number: ABCDE1234F", 50, 230);
    ctx.fillText("Phone: +91 9876543210", 50, 310);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "aadhaar_aws_sample_leak.png", { type: "image/png" });
      await handleUpload(file);
    }, "image/png");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Hero title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
          <span>Scan Once. Share Safely.</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Prevent Accidental Digital Information Exposure
        </h1>
        <p className="text-sm text-[#8CA3B8] max-w-xl mx-auto leading-relaxed">
          Ingest screenshots, receipts, invoices, and documents. Automatically detect leaked credentials,
          secrets, and PII, and generate secure SafeShare redacted copies.
        </p>
      </div>

      {/* Main Drag-and-Drop Uploader */}
      <UploadCard onUpload={handleUpload} isLoading={isUploading} />

      {/* 1-Click Demo Quick Sample Trigger */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={handleTrySample}
          disabled={isUploading}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#0F172A] hover:bg-[#162032] border border-[#1E293B] text-xs font-semibold text-[#8CA3B8] hover:text-white transition-all cursor-pointer shadow-lg disabled:opacity-50"
        >
          <FileText className="w-4 h-4 text-[#7C3AED]" />
          <span>Need a sample? Test 1-Click Demo (Aadhaar + AWS Secret)</span>
        </button>
      </div>

      {/* Supported formats */}
      <SupportedFormats />

      {/* "Before You Upload" Enterprise Guarantees */}
      <SecurityInfoBanner />
    </div>
  );
};
