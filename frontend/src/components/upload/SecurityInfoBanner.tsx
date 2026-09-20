import React from "react";
import { ShieldCheck, Eye, Lock, CheckCircle2 } from "lucide-react";

export const SecurityInfoBanner: React.FC = () => {
  const highlights = [
    {
      icon: Lock,
      title: "Processed Locally",
      desc: "Your document never leaves this device. Zero cloud telemetry, zero third-party storage.",
      badge: "Private",
      badgeColor: "text-[#22C55E] bg-[#22C55E]/15 border-[#22C55E]/30",
    },
    {
      icon: Eye,
      title: "Reading Text & Numbers",
      desc: "Phone, Aadhaar, PAN, Passport, QR codes, UPI IDs, and keys are detected without exposing raw data.",
      badge: "Privacy Scan",
      badgeColor: "text-[#8B5CF6] bg-[#8B5CF6]/15 border-[#8B5CF6]/30",
    },
    {
      icon: ShieldCheck,
      title: "SafeShare Output",
      desc: "Document metadata is stripped automatically, and sensitive areas are masked before sharing.",
      badge: "Sanitized",
      badgeColor: "text-[#22C55E] bg-[#22C55E]/15 border-[#22C55E]/30",
    },
  ];

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-[#111827] border border-[#1F2937] shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">
            Before You Upload — Privacy & Protection Guarantees
          </h4>
        </div>
        <span className="text-[11px] font-semibold text-[#22C55E] flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Local Engine Active</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {highlights.map(({ icon: Icon, title, desc, badge, badgeColor }) => (
          <div
            key={title}
            className="p-4 rounded-2xl bg-[#090B14] border border-[#1F2937] flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-[#111827] text-[#22C55E] border border-[#1F2937]">
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeColor}`}>
                {badge}
              </span>
            </div>
            <div>
              <h5 className="text-sm font-bold text-white mb-1">{title}</h5>
              <p className="text-xs text-[#8CA3B8] leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
