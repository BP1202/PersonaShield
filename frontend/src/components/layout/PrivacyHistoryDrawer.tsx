import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  X,
  History,
  ShieldCheck,
  ArrowRight,
  Trash2,
  Calendar,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  getScanHistory,
  clearScanHistory,
  type ScanHistoryItem,
} from "../../utils/scanHistory";

interface PrivacyHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyHistoryDrawer: React.FC<PrivacyHistoryDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setHistory(getScanHistory());
    }
  }, [isOpen]);

  const handleClear = () => {
    clearScanHistory();
    setHistory([]);
  };

  const totalProtected = history.reduce((sum, item) => sum + (item.itemsCount || 0), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#111827] border-l border-[#1F2937] shadow-2xl flex flex-col justify-between p-6 overflow-y-auto">
          {/* Top Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#1F2937]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Privacy History</h3>
                  <p className="text-[11px] text-[#8CA3B8]">Saved locally on this device</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-[#090B14] border border-[#1F2937] text-[#8CA3B8] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Privacy Habits Widget */}
            <div className="p-4 rounded-2xl bg-[#090B14] border border-[#1F2937] space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span>Privacy Habits</span>
                </span>
                <span className="text-[10px] text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-full border border-[#22C55E]/20">
                  Active Shield
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                <div className="p-2.5 rounded-xl bg-[#111827] border border-[#1F2937]">
                  <div className="text-lg font-extrabold text-white">{history.length}</div>
                  <div className="text-[10px] text-[#8CA3B8]">Docs Protected</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#111827] border border-[#1F2937]">
                  <div className="text-lg font-extrabold text-[#22C55E]">{totalProtected}</div>
                  <div className="text-[10px] text-[#8CA3B8]">Items Sanitized</div>
                </div>
              </div>
            </div>

            {/* Timeline List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs text-[#8CA3B8]">
                <span>Recent Scans ({history.length})</span>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="py-12 text-center space-y-2 bg-[#090B14] rounded-2xl border border-[#1F2937] p-6">
                  <ShieldCheck className="w-8 h-8 text-[#8CA3B8] mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-white">No scan history yet</p>
                  <p className="text-[11px] text-[#8CA3B8]">
                    Documents you inspect will appear here for quick access.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {history.map((item) => (
                    <div
                      key={item.scanId}
                      className="p-3.5 rounded-2xl bg-[#090B14] border border-[#1F2937] hover:border-[#8B5CF6]/50 transition-all space-y-2.5 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate max-w-[190px]">
                          {item.fileName || `Scan #${item.scanId.slice(0, 8)}`}
                        </span>
                        <span className="text-[10px] font-semibold text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-md border border-[#22C55E]/20">
                          {item.itemsCount} protected
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#8CA3B8]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#8CA3B8]" />
                          <span>{new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </span>
                        {item.scoreAfter !== undefined && (
                          <span className="text-[#E8EEF8]">
                            Score: <span className="text-[#22C55E] font-bold">{item.scoreAfter}/100</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-[#1F2937]">
                        <Link
                          to={`/results/${item.scanId}`}
                          onClick={onClose}
                          className="flex-1 py-1 px-2 rounded-lg bg-[#111827] hover:bg-[#1F2937] text-center text-[11px] font-semibold text-white transition-colors flex items-center justify-center gap-1"
                        >
                          <span>Report</span>
                          <ArrowRight className="w-3 h-3 text-[#8B5CF6]" />
                        </Link>
                        <Link
                          to={`/safeshare/${item.scanId}`}
                          onClick={onClose}
                          className="flex-1 py-1 px-2 rounded-lg bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/30 text-center text-[11px] font-semibold text-[#A78BFA] transition-colors flex items-center justify-center gap-1"
                        >
                          <span>SafeShare</span>
                          <ExternalLink className="w-3 h-3 text-[#A78BFA]" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Trust Note */}
          <div className="pt-4 border-t border-[#1F2937] text-[11px] text-[#8CA3B8] text-center">
            <span>Client-side storage only • No data sent to external cloud</span>
          </div>
        </div>
      </div>
    </div>
  );
};
