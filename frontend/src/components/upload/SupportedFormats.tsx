import React from "react";
import { Zap, ShieldCheck, ArrowRight, Lock } from "lucide-react";
import { Button } from "../common/Button";

interface SupportedFormatsProps {
  onTrySample?: () => void;
  isLoading?: boolean;
}

export const SupportedFormats: React.FC<SupportedFormatsProps> = ({
  onTrySample,
  isLoading = false,
}) => {
  return (
    <div className="space-y-2.5">
      {/* Sleek Minimal 1-Click Demo Showcase Card */}
      <div className="bg-[#111827] rounded-3xl p-5 sm:p-6 border border-[#1F2937] hover:border-[#8B5CF6]/40 transition-all shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
          {/* Left: Clean Thumbnail */}
          <div className="sm:col-span-4 relative group">
            <div className="relative overflow-hidden rounded-2xl border border-[#1F2937] bg-[#090B14]">
              <img
                src="/sample_aadhaar.png"
                alt="Aadhaar Card Sample"
                className="w-full h-36 sm:h-40 object-cover object-top transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute top-2.5 left-2.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#090B14]/90 backdrop-blur border border-white/10 text-[10px] font-bold text-white shadow">
                  <ShieldCheck className="w-3 h-3 text-[#22C55E]" />
                  Aadhaar Sample
                </span>
              </div>
            </div>
          </div>

          {/* Right: Minimal Text & Action */}
          <div className="sm:col-span-8 space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[11px] font-semibold text-[#A78BFA]">
                <Zap className="w-3 h-3 fill-[#8B5CF6]" />
                1-Click Live Demo
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#22C55E] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                Live OCR Pipeline
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Aadhaar Identity Leak & SafeShare Protection
              </h3>
              <p className="text-xs text-[#8CA3B8] mt-1 leading-relaxed">
                Test automated detection of 12-digit Indian Aadhaar numbers and instant privacy masking.
              </p>
            </div>

            {/* Quick Minimal Tags */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="px-2.5 py-0.5 rounded-full bg-[#1F2937]/80 border border-[#374151] text-[11px] text-[#CBD5E1]">
                12-Digit UID
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#1F2937]/80 border border-[#374151] text-[11px] text-[#CBD5E1]">
                Full Name & DOB
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#1F2937]/80 border border-[#374151] text-[11px] text-[#CBD5E1]">
                Auto SafeShare Blur
              </span>
            </div>

            {/* Launch CTA */}
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="primary"
                size="md"
                isLoading={isLoading}
                onClick={onTrySample}
                leftIcon={<Zap className="w-4 h-4" />}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="font-bold shadow-lg shadow-[#8B5CF6]/20 cursor-pointer text-xs sm:text-sm"
              >
                Test 1-Click Demo
              </Button>

              <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Processed locally • Zero cloud upload
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
