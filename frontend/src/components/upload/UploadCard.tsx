import React, { useState, useRef } from "react";
import { UploadCloud, File, AlertCircle, X, ArrowRight } from "lucide-react";
import { Button } from "../common/Button";

interface UploadCardProps {
  onUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
}

export const UploadCard: React.FC<UploadCardProps> = ({ onUpload, isLoading = false }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
  ];
  const maxBytes = 15 * 1024 * 1024; // 15 MB

  const validateAndSetFile = (file: File) => {
    setError(null);
    if (!allowedTypes.includes(file.type)) {
      setError("Unsupported format. Please upload PNG, JPG, WebP, or PDF.");
      return;
    }
    if (file.size > maxBytes) {
      setError("File exceeds maximum allowed size of 15 MB.");
      return;
    }
    setSelectedFile(file);
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
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    try {
      await onUpload(selectedFile);
    } catch (err: any) {
      setError(err.message || "Upload failed. Please check your network and try again.");
    }
  };

  return (
    <div className="w-full bg-[#121A2E] rounded-3xl p-6 sm:p-8 border border-[#1E293B] shadow-2xl relative overflow-hidden">
      {/* Cyber ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#A855F7]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#14B8A6]/5 rounded-full blur-3xl pointer-events-none" />

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
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[280px] ${
            dragActive
              ? "border-[#A855F7] bg-[#A855F7]/10 scale-[1.01]"
              : "border-[#1E293B] hover:border-[#A855F7]/60 hover:bg-[#1A243F]/50 bg-[#0B1020]/50"
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#A855F7]/20 to-[#14B8A6]/20 border border-[#A855F7]/30 flex items-center justify-center text-[#A855F7] mb-4 shadow-lg shadow-[#A855F7]/10">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-semibold text-white mb-1">
            Drop screenshot, document, or PDF here
          </h3>
          <p className="text-sm text-[#94A3B8] max-w-sm mb-4">
            Upload any digital artifact to automatically detect exposed credentials, PII, or confidential tokens.
          </p>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Browse from Computer
          </Button>

          <p className="text-[11px] text-[#64748B] mt-4">
            Max 15 MB • PNG, JPG, WebP, PDF • Zero cloud telemetry
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-[#0B1020] border border-[#1E293B] flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-[#A855F7]/10 border border-[#A855F7]/30 flex items-center justify-center text-[#A855F7] shrink-0">
                <File className="w-6 h-6" />
              </div>
              <div className="truncate">
                <div className="font-semibold text-sm text-white truncate">
                  {selectedFile.name}
                </div>
                <div className="text-xs text-[#94A3B8]">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type || "Document"}
                </div>
              </div>
            </div>

            {!isLoading && (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="text-xs text-[#14B8A6] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
              <span>Ready for deterministic cybersecurity scan</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={handleClear}
                disabled={isLoading}
              >
                Cancel
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
                Start Cybersecurity Scan
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
