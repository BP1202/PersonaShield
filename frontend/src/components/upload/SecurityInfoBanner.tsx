import React from "react";
import { ShieldCheck, Cpu, Clock, HardDriveDownload } from "lucide-react";

export const SecurityInfoBanner: React.FC = () => {
  const highlights = [
    {
      icon: Cpu,
      title: "Local AI Execution",
      desc: "Deterministic OCR & regex parsing without sending data to public AI clouds.",
    },
    {
      icon: HardDriveDownload,
      title: "15 MB Request Bound",
      desc: "Hardware-enforced upload buffers protecting against memory exhaustion.",
    },
    {
      icon: Clock,
      title: "24-Hour Privacy TTL",
      desc: "Original uploads automatically purged from storage after 24 hours.",
    },
    {
      icon: ShieldCheck,
      title: "SafeShare Ready",
      desc: "Instant reversible redaction with complete EXIF and GPS stripping.",
    },
  ];

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-[#121A2E]/60 border border-[#1E293B]">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#14B8A6]">
          Privacy-First Architecture Guarantees
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {highlights.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#0B1020] text-[#14B8A6] mt-0.5 border border-[#1E293B]">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-semibold text-white">{title}</h5>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
