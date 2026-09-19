import React from "react";
import { CheckCircle2, Circle, AlertCircle, Loader2 } from "lucide-react";

export type StageState = "pending" | "running" | "completed" | "error";

export interface PipelineStage {
  id: string;
  name: string;
  endpoint: string;
  description: string;
  state: StageState;
  detail?: string;
}

interface ProcessingTimelineProps {
  stages: PipelineStage[];
}

export const ProcessingTimeline: React.FC<ProcessingTimelineProps> = ({ stages }) => {
  return (
    <div className="w-full bg-[#121A2E] rounded-3xl p-6 sm:p-8 border border-[#1E293B] shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#1E293B] mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Preventive Pipeline Analysis</h3>
          <p className="text-xs text-[#94A3B8]">
            Deterministic AI and regex extraction running in live sequence
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B1020] border border-[#1E293B] text-xs text-[#14B8A6]">
          <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-ping" />
          <span>Real API Pipeline</span>
        </div>
      </div>

      {/* Stage list */}
      <div className="space-y-6 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-[#1E293B] before:z-0">
        {stages.map((stage) => {
          return (
            <div key={stage.id} className="relative z-10 flex items-start gap-4">
              {/* Status Icon */}
              <div className="shrink-0 mt-0.5">
                {stage.state === "completed" && (
                  <div className="w-10 h-10 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/40 flex items-center justify-center text-[#22C55E] shadow-lg shadow-[#22C55E]/10">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                {stage.state === "running" && (
                  <div className="w-10 h-10 rounded-xl bg-[#A855F7]/15 border border-[#A855F7]/40 flex items-center justify-center text-[#A855F7] shadow-lg shadow-[#A855F7]/20">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}
                {stage.state === "pending" && (
                  <div className="w-10 h-10 rounded-xl bg-[#0B1020] border border-[#1E293B] flex items-center justify-center text-[#64748B]">
                    <Circle className="w-4 h-4" />
                  </div>
                )}
                {stage.state === "error" && (
                  <div className="w-10 h-10 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 flex items-center justify-center text-[#EF4444]">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Stage Content */}
              <div className="flex-1 min-w-0 bg-[#0B1020]/60 p-4 rounded-2xl border border-[#1E293B]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{stage.name}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#121A2E] text-[#94A3B8] border border-[#1E293B]">
                      {stage.endpoint}
                    </span>
                  </div>

                  {/* State badge */}
                  <div>
                    {stage.state === "completed" && (
                      <span className="text-[11px] font-semibold text-[#22C55E] flex items-center gap-1">
                        Completed
                      </span>
                    )}
                    {stage.state === "running" && (
                      <span className="text-[11px] font-semibold text-[#A855F7] flex items-center gap-1">
                        Running...
                      </span>
                    )}
                    {stage.state === "pending" && (
                      <span className="text-[11px] text-[#64748B]">Waiting</span>
                    )}
                    {stage.state === "error" && (
                      <span className="text-[11px] font-semibold text-[#EF4444]">Failed</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#94A3B8]">{stage.description}</p>

                {stage.detail && (
                  <div className="mt-2.5 pt-2 border-t border-[#1E293B] text-xs font-mono text-[#14B8A6] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />
                    <span>{stage.detail}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
