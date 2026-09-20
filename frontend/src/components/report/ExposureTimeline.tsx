import React from "react";
import { Eye, Zap, ShieldCheck, ArrowRight } from "lucide-react";
import type { ExposureChainData } from "../../types/api";

interface ExposureTimelineProps {
  chains: ExposureChainData[] | Record<string, any>;
}

export const ExposureTimeline: React.FC<ExposureTimelineProps> = ({ chains }) => {
  const normalizedChains = Array.isArray(chains)
    ? chains
    : Object.entries(chains || {}).map(([key, value]) => ({
        finding_type: key,
        title: `${key.replace(/_/g, " ")} Chain`,
        steps: Array.isArray(value) ? value : [],
      }));

  if (normalizedChains.length === 0) {
    return null;
  }

  const stepMeta = [
    { label: "Step 1: Observation", icon: Eye, color: "#A855F7" },
    { label: "Step 2: Potential Abuse", icon: Zap, color: "#EF4444" },
    { label: "Step 3: Safe Remediation", icon: ShieldCheck, color: "#22C55E" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">3-Step Exposure Chains</h3>
          <p className="text-xs text-[#94A3B8]">
            Verifiable attack progression timelines: Observation → Potential Abuse → Remediation
          </p>
        </div>
      </div>

      {normalizedChains.map((chain) => (
        <div
          key={chain.finding_type}
          className="p-5 rounded-2xl bg-[#121A2E] border border-[#1E293B] shadow-lg space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#A855F7]" />
            <h4 className="font-semibold text-xs text-white uppercase tracking-wider">
              {chain.title || chain.finding_type.replace(/_/g, " ")}
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
            {(chain.steps || []).map((step: any, idx: number) => {
              const meta = stepMeta[idx] || stepMeta[0];
              const Icon = meta.icon;
              const stepTitle = step.stage || step.title || meta.label;

              return (
                <div
                  key={step.step_number || step.step || idx}
                  className="p-4 rounded-xl bg-[#0B1020] border border-[#1E293B] flex flex-col justify-between relative"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
                        style={{ color: meta.color }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </span>
                      {idx < (chain.steps || []).length - 1 && (
                        <ArrowRight className="hidden md:block w-3.5 h-3.5 text-[#334155] -mr-6 z-10" />
                      )}
                    </div>

                    <h5 className="font-bold text-xs text-white mb-1">{stepTitle}</h5>
                    <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
