import React, { useEffect, useRef } from "react";
import { Terminal, Shield, CheckCircle2 } from "lucide-react";

export interface EngineLogEntry {
  timestamp: string;
  message: string;
  level: "info" | "success" | "warn" | "accent";
}

interface LiveEngineTerminalProps {
  logs: EngineLogEntry[];
}

export const LiveEngineTerminal: React.FC<LiveEngineTerminalProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getLevelColor = (level: EngineLogEntry["level"]) => {
    switch (level) {
      case "success":
        return "text-[#10B981]";
      case "warn":
        return "text-[#F59E0B]";
      case "accent":
        return "text-[#7C3AED]";
      default:
        return "text-[#8CA3B8]";
    }
  };

  return (
    <div className="w-full bg-[#060816] rounded-3xl border border-[#1E293B] shadow-2xl overflow-hidden font-mono text-xs">
      {/* Terminal Titlebar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#0F172A] border-b border-[#1E293B]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <Terminal className="w-3.5 h-3.5 text-[#7C3AED]" />
          <span className="text-white font-bold text-xs tracking-wider uppercase">
            PersonaShield AI Engine Stream
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[11px] text-[#10B981] font-semibold">Live Operational</span>
        </div>
      </div>

      {/* Terminal Log Stream Output */}
      <div className="p-5 space-y-2 max-h-[260px] overflow-y-auto select-text">
        {logs.map((log, idx) => (
          <div key={idx} className="flex items-start gap-3 leading-relaxed">
            <span className="text-[#64748B] shrink-0 font-mono">[{log.timestamp}]</span>
            <span className={`${getLevelColor(log.level)} flex-1`}>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Terminal Footer */}
      <div className="px-5 py-2.5 bg-[#0F172A]/50 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-[#8CA3B8]">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-[#10B981]" />
          <span>Local Engine Execution • Deterministic Isolation</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
          <span>Zero cloud telemetry</span>
        </div>
      </div>
    </div>
  );
};
