import React, { useState, useRef } from "react";
import { UploadCloud, File, AlertCircle, X, ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { Button } from "../common/Button";

interface UploadCardProps {
  onUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
}

export const UploadCard: React.FC<UploadCardProps> = ({ onUpload, isLoading = false }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
  ];
  const maxBytes = 10 * 1024 * 1024; // 10 MB

  const validateAndSetFile = (file: File) => {
    setError(null);
    if (!allowedTypes.includes(file.type)) {
      setError("Unsupported format. Please upload PNG, JPG, WebP, or PDF.");
      return;
    }
    if (file.size > maxBytes) {
      setError("File exceeds maximum allowed size of 10 MB.");
      return;
    }
    setSelectedFile(file);

    // Generate local preview if image
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    try {
      await onUpload(selectedFile);
    } catch (err: any) {
      setError(err.message || "Upload failed. Please check your connection and try again.");
    }
  };

  return (
    <div className="w-full bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#1F2937] shadow-2xl relative overflow-hidden space-y-6">
      <input
        ref={inputRef}
        type="file"
        id="document-upload-input"
        className="hidden"
        accept=".png,.jpg,.jpeg,.webp,.pdf"
        onChange={handleInputChange}
        disabled={isLoading}
      />

      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[300px] relative ${
            dragActive
              ? "border-[#8B5CF6] bg-[#8B5CF6]/10 scale-[1.01] shadow-2xl shadow-[#8B5CF6]/20"
              : "border-[#1F2937] hover:border-[#8B5CF6]/60 hover:bg-[#162032]/40 bg-[#090B14]"
          }`}
        >
          {/* Animated glow icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#14B8A6]/20 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] mb-4 shadow-lg shadow-[#8B5CF6]/15 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-white mb-1.5 tracking-tight">
            Drop screenshot, document, or PDF here
          </h3>
          <p className="text-xs sm:text-sm text-[#8CA3B8] max-w-md mb-5 leading-relaxed">
            Upload any digital artifact to automatically find sensitive details and create a protected copy.
          </p>

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Browse from Device
          </Button>

          {/* Trust Guarantees Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-6 text-[11px] text-[#8CA3B8]">
            <span className="flex items-center gap-1 text-[#22C55E] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Processed Locally — Never uploaded to cloud</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-[#14B8A6]">
              <Lock className="w-3.5 h-3.5" />
              <span>Sanitized & safe before sharing</span>
            </span>
            <span>•</span>
            <span>Max 10 MB</span>
          </div>
        </div>
      ) : (
        /* Document Preview Before Scanning */
        <div className="space-y-5">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#090B14] border border-[#1F2937] flex flex-col sm:flex-row items-center gap-4 justify-between">
            <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Document Preview"
                  className="w-16 h-16 object-cover rounded-xl border border-[#1F2937] shadow-md shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] shrink-0">
                  <File className="w-7 h-7" />
                </div>
              )}
              <div className="truncate">
                <div className="font-bold text-sm text-white truncate">
                  {selectedFile.name}
                </div>
                <div className="text-xs text-[#8CA3B8] mt-0.5">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for Privacy Scan
                </div>
              </div>
            </div>

            {!isLoading && (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 rounded-xl text-[#8CA3B8] hover:text-white hover:bg-[#1F2937] transition-colors cursor-pointer self-end sm:self-auto"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between pt-1">
            <div className="text-xs text-[#22C55E] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span>Reading text from your document locally</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={handleClear}
                disabled={isLoading}
              >
                Choose Different File
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={handleSubmit}
                className="w-full sm:w-auto"
              >
                Start Privacy Scan
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
