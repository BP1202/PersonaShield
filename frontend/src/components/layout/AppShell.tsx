import React, { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Shield, ArrowRight, History } from "lucide-react";
import { PrivacyHistoryDrawer } from "./PrivacyHistoryDrawer";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const location = useLocation();
  const { scanId } = useParams();

  const steps = [
    { label: "1. Select Document", path: "/", active: location.pathname === "/" },
    {
      label: "2. Privacy Scan",
      path: scanId ? `/processing/${scanId}` : "#",
      active: location.pathname.startsWith("/processing"),
      disabled: !scanId && !location.pathname.startsWith("/processing"),
    },
    {
      label: "3. Privacy Report",
      path: scanId ? `/results/${scanId}` : "#",
      active: location.pathname.startsWith("/results"),
      disabled: !scanId && !location.pathname.startsWith("/results"),
    },
    {
      label: "4. SafeShare Protected Copy",
      path: scanId ? `/safeshare/${scanId}` : "#",
      active: location.pathname.startsWith("/safeshare"),
      disabled: !scanId && !location.pathname.startsWith("/safeshare"),
    },
  ];

  return (
    <div className="min-h-screen bg-[#090B14] text-[#E8EEF8] flex flex-col selection:bg-[#8B5CF6]/30 selection:text-white">
      {/* Human-First Header with Cyber Gradient */}
      <header className="border-b border-[#1F2937] header-cyber-gradient sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#14B8A6] p-[2px] shadow-lg shadow-[#8B5CF6]/25 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#111827] rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#8B5CF6]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">PersonaShield</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-[#8CA3B8] -mt-0.5">Personal Privacy Protection</p>
            </div>
          </Link>

          {/* Workflow Breadcrumb Indicator */}
          <nav className="hidden md:flex items-center gap-1 bg-[#111827]/70 backdrop-blur-sm p-1 rounded-xl border border-[#1F2937]">
            {steps.map((step, idx) => (
              <React.Fragment key={step.label}>
                {step.disabled ? (
                  <span className="px-3 py-1 text-xs font-medium text-[#4B5563] rounded-lg cursor-not-allowed">
                    {step.label}
                  </span>
                ) : (
                  <Link
                    to={step.path}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                      step.active
                        ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30"
                        : "text-[#8CA3B8] hover:text-[#E8EEF8] hover:bg-[#1F2937]"
                    }`}
                  >
                    {step.label}
                  </Link>
                )}
                {idx < steps.length - 1 && <ArrowRight className="w-3 h-3 text-[#374151]" />}
              </React.Fragment>
            ))}
          </nav>

          {/* Right Header Actions: History Drawer + Engine Status */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-semibold text-[#E8EEF8] hover:text-white transition-all cursor-pointer shadow-sm"
              title="View your recent scan history on this device"
            >
              <History className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>History</span>
            </button>

            <div 
              className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/30 text-[#14B8A6] text-xs font-medium cursor-help"
              title="Processing on your device / secure backend. Original file is removed after 24h."
            >
              <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
              <span>Protection Engine Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Global Privacy History Drawer */}
      <PrivacyHistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer Trust Bar */}
      <footer className="border-t border-[#1F2937] bg-[#111827]/70 py-5 text-center text-xs text-[#8CA3B8]">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-[#E8EEF8]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <span>Processed Locally</span>
          </span>
          <span className="text-[#374151]">•</span>
          <span className="flex items-center gap-1.5 font-medium text-[#E8EEF8]">
            <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
            <span>Zero Retention</span>
          </span>
          <span className="text-[#374151]">•</span>
          <span className="flex items-center gap-1.5 font-medium text-[#E8EEF8]">
            <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
            <span>Safe to Share</span>
          </span>
          <span className="text-[#374151]">•</span>
          <span className="flex items-center gap-1.5 font-medium text-[#E8EEF8]">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Auto Deleted in 24 Hours</span>
          </span>
        </div>
      </footer>
    </div>
  );
};
