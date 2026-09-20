import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Shield, ShieldCheck, ArrowRight, Lock } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
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

          {/* Protection Ready Status & Security Guarantee */}
          <div className="flex items-center gap-3">
            <div 
              className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/30 text-[#14B8A6] text-xs font-medium cursor-help"
              title="All privacy scanning is running locally on your device"
            >
              <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
              <span>Protection Ready</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#8CA3B8] border-l border-[#1F2937] pl-3">
              <Lock className="w-3.5 h-3.5 text-[#14B8A6]" />
              <span className="hidden lg:inline">Local Privacy</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1E293B] bg-[#121A2E]/50 py-6 text-center text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#A855F7]" />
            <span className="font-medium text-[#94A3B8]">
              PersonaShield AI — Scan Once. Share Safely.
            </span>
          </div>
          <p className="text-[#64748B]">
            Evidence-Based Cybersecurity • 24h Privacy TTL • No Cloud Telemetry
          </p>
        </div>
      </footer>
    </div>
  );
};
