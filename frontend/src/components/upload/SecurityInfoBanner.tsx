import React from "react";
import { ShieldCheck, Eye, Lock, CheckCircle2 } from "lucide-react";

export const SecurityInfoBanner: React.FC = () => {
  const highlights = [
    {
      icon: Lock,
      title: "Local Processing",
      desc: "Images never leave your device/server. Zero telemetry, zero third-party cloud uploads.",
      badge: "Private",
      badgeColor: "text-[#10B981] bg-[#10B981]/15 border-[#10B981]/30",
    },
    {
      icon: Eye,
      title: "OCR & Pattern Detection",
      desc: "Phone, Aadhaar, PAN, Passport, QR, UPI, Email, Cards, and IAM Secrets detected deterministically.",
      badge: "Deterministic",
      badgeColor: "text-[#7C3AED] bg-[#7C3AED]/15 border-[#7C3AED]/30",
    },
    {
      icon: ShieldCheck,
      title: "SafeShare Output",
      desc: "Lossless Blur, Pixelate, Blackout, and 100% EXIF & GPS metadata removal before sharing.",
      badge: "Sanitized",
      badgeColor: "text-[#10B981] bg-[#10B981]/15 border-[#10B981]/30",
    },
  ];

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-[#0F172A] border border-[#1E293B] shadow-2xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">
            Before You Upload — Defensive Cybersecurity Guarantees
          </h4>
        </div>
        <span className="text-[11px] font-mono text-[#10B981] flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Verified Local Pipeline</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {highlights.map(({ icon: Icon, title, desc, badge, badgeColor }) => (
          <div
            key={title}
            className="p-4 rounded-2xl bg-[#060816] border border-[#1E293B] flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-[#0F172A] text-[#10B981] border border-[#1E293B]">
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
