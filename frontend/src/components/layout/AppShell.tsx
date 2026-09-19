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
    { label: "1. Upload", path: "/", active: location.pathname === "/" },
    {
      label: "2. Processing",
      path: scanId ? `/processing/${scanId}` : "#",
      active: location.pathname.startsWith("/processing"),
      disabled: !scanId && !location.pathname.startsWith("/processing"),
    },
    {
      label: "3. Cyber Safety Receipt",
      path: scanId ? `/results/${scanId}` : "#",
      active: location.pathname.startsWith("/results"),
      disabled: !scanId && !location.pathname.startsWith("/results"),
    },
    {
      label: "4. SafeShare Redaction",
      path: scanId ? `/safeshare/${scanId}` : "#",
      active: location.pathname.startsWith("/safeshare"),
      disabled: !scanId && !location.pathname.startsWith("/safeshare"),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B1020] text-[#E5E7EB] flex flex-col selection:bg-[#A855F7]/30 selection:text-white">
      {/* Cybersecurity Top Navigation */}
      <header className="border-b border-[#1E293B] bg-[#121A2E]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A855F7] to-[#14B8A6] p-[2px] shadow-lg shadow-[#A855F7]/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#121A2E] rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#A855F7]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">PersonaShield</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#A855F7]/20 text-[#A855F7] border border-[#A855F7]/30">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] -mt-0.5">Preventive Cybersecurity</p>
            </div>
          </Link>

          {/* Workflow Breadcrumb Indicator */}
          <nav className="hidden md:flex items-center gap-1 bg-[#0B1020]/60 p-1 rounded-xl border border-[#1E293B]">
            {steps.map((step, idx) => (
              <React.Fragment key={step.label}>
                {step.disabled ? (
                  <span className="px-3 py-1 text-xs font-medium text-[#64748B] rounded-lg cursor-not-allowed">
                    {step.label}
                  </span>
                ) : (
                  <Link
                    to={step.path}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                      step.active
                        ? "bg-[#A855F7] text-white shadow-md shadow-[#A855F7]/20"
                        : "text-[#94A3B8] hover:text-[#E5E7EB] hover:bg-[#121A2E]"
                    }`}
                  >
                    {step.label}
                  </Link>
                )}
                {idx < steps.length - 1 && <ArrowRight className="w-3 h-3 text-[#334155]" />}
              </React.Fragment>
            ))}
          </nav>

          {/* Engine Status & Security Guarantee */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/30 text-[#14B8A6] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
              <span>Engine Online</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] border-l border-[#1E293B] pl-3">
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
