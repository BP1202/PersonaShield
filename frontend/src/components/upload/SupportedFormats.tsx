import React from "react";
import { FileImage, FileText } from "lucide-react";

export const SupportedFormats: React.FC = () => {
  const formats = [
    { ext: "PNG", label: "Screenshots & UI", icon: FileImage },
    { ext: "JPG / JPEG", label: "Camera Photos", icon: FileImage },
    { ext: "PDF", label: "Invoices & Documents", icon: FileText },
    { ext: "WEBP", label: "Web Graphics", icon: FileImage },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {formats.map(({ ext, label, icon: Icon }) => (
        <div
          key={ext}
          className="flex items-center gap-3 p-3 rounded-xl bg-[#121A2E] border border-[#1E293B] hover:border-[#334155] transition-colors"
        >
          <div className="p-2 rounded-lg bg-[#0B1020] text-[#A855F7]">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-xs text-white">{ext}</div>
            <div className="text-[11px] text-[#94A3B8]">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
