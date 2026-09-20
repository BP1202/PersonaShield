import React, { useState } from "react";
import {
  ShieldAlert,
  Zap,
  GraduationCap,
  AlertOctagon,
  CheckCircle2,
  Lock,
  ExternalLink,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import type { EvidenceCardData } from "../../types/api";

interface CyberGuardianCardProps {
  findings: EvidenceCardData[];
}

export const CyberGuardianCard: React.FC<CyberGuardianCardProps> = ({ findings = [] }) => {
  const [activeTab, setActiveTab] = useState<"simulator" | "coach" | "emergency">("simulator");

  // Zero findings — show safe state
  if (findings.length === 0) {
    return (
      <div className="w-full bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#22C55E]/30 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E] shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Cyber Guardian</h3>
            <p className="text-xs text-[#8CA3B8]">No threats to simulate — your document appears safe.</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#090B14] border border-[#22C55E]/30 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
          <span className="text-sm text-[#E8EEF8]">PersonaShield found no sensitive credentials, identity numbers, or personal data to simulate threats against. This document is safe to share.</span>
        </div>
      </div>
    );
  }

  // Determine dominant document category
  const types = findings.map((f) => (f.finding_type || "").toUpperCase());
  const hasAadhaar = types.some((t) => t.includes("AADHAAR"));
  const hasPan = types.some((t) => t.includes("PAN"));
  const hasKey = types.some((t) => t.includes("AWS") || t.includes("KEY") || t.includes("SECRET") || t.includes("TOKEN"));
  const hasPhone = types.some((t) => t.includes("PHONE"));
  const hasSalary = types.some((t) => t.includes("SALARY") || t.includes("PAY") || t.includes("FINANCIAL"));

  // Dynamic Attack Profile Content — generic defaults, specialized by finding type
  let threatTitle = "General Privacy Exposure Risk";
  let attackerSees = "Sensitive personal or organizational information.";
  let whatCouldHappen = "Social engineering, impersonation, or targeted phishing.";
  let personaShieldBlocked = "All detected sensitive information has been masked or removed.";

  let timelineStep1 = {
    title: "1. Information Collected",
    desc: "Attacker saves or scrapes the document from a public or shared channel.",
  };
  let timelineStep2 = {
    title: "2. Reconnaissance",
    desc: "Exposed details are cross-referenced with public databases and social profiles.",
  };
  let timelineStep3 = {
    title: "3. Exploitation",
    desc: "Attacker uses the assembled profile for fraud, impersonation, or targeted phishing.",
  };

  let coachLesson = {
    title: "Always review documents for private details before sharing them.",
    why: "Even casual screenshots can contain sensitive data that automated scrapers collect within minutes.",
    saferVersion: "Use PersonaShield to mask sensitive fields and strip metadata before distributing.",
    safetyTip: "Make it a habit to scan every document through PersonaShield before sending.",
  };

  if (hasKey) {
    threatTitle = "Cloud Infrastructure & Key Exposure";
    attackerSees = "Active API keys, secret tokens, or private endpoints.";
    whatCouldHappen = "Automated scraper theft, cloud cryptojacking, multi-thousand dollar unauthorized bill.";
    personaShieldBlocked = "Full access keys permanently blacked out • No API credentials exposed.";

    timelineStep1 = {
      title: "1. Scraper Ingestion",
      desc: "Automated bots crawl screenshots and OCR raw character sequences within 90 seconds.",
    };
    timelineStep2 = {
      title: "2. Cloud Takeover",
      desc: "Bot spawns 50+ high-cost GPU instances to mine cryptocurrency using your cloud account.",
    };
    timelineStep3 = {
      title: "3. Financial Shock",
      desc: "You receive a surprise $10,000+ cloud bill or database ransom demand 48 hours later.",
    };

    coachLesson = {
      title: "Rotate exposed API keys immediately; never trust client-side screenshots.",
      why: "Cloud credentials shared in screenshots are scraped by automated crawler networks within minutes of public posting.",
      saferVersion: "Store secrets in environment variables and blackout keys completely before taking captures.",
      safetyTip: "Set up cloud budget alerts so you are notified the moment unexpected compute charges occur.",
    };
  } else if (hasAadhaar) {
    threatTitle = "Identity Theft & Misuse Risk";
    attackerSees = "Your personal identity numbers and contact details.";
    whatCouldHappen = "SIM swap, fake KYC, instant loan fraud, spear-phishing.";
    personaShieldBlocked = "Identifiers masked • Contact numbers blurred • Metadata removed.";

    timelineStep1 = {
      title: "1. Information Collected",
      desc: "Scammer saves this document from WhatsApp, email, or a public portal.",
    };
    timelineStep2 = {
      title: "2. Identity Misuse",
      desc: "Uses Aadhaar photocopy for unauthorized KYC or duplicate SIM card request.",
    };
    timelineStep3 = {
      title: "3. Financial Abuse",
      desc: "Attempts OTP redirection, instant micro-loan registration, or impersonation fraud.",
    };

    coachLesson = {
      title: "Never send an unmasked Aadhaar card to brokers or strangers on WhatsApp.",
      why: "Aadhaar contains a permanent identity number that is cross-referenced across telecommunication and financial verification portals.",
      saferVersion: "Mask the first 8 digits (XXXX-XXXX-1234) and add a purpose watermark before sharing.",
      safetyTip: "Use Masked Aadhaar whenever someone only needs identity verification, not your complete number.",
    };
  } else if (hasPan) {
    threatTitle = "Tax Identity & Financial Linking Risk";
    attackerSees = "Permanent Account Number (PAN) and associated personal names.";
    whatCouldHappen = "Credit score poisoning, fake GST registration, impersonation on fintech lending apps.";
    personaShieldBlocked = "Central PAN digits masked with privacy pixelation.";

    timelineStep1 = {
      title: "1. PAN Harvesting",
      desc: "Document is harvested and archived in scammer identity databases.",
    };
    timelineStep2 = {
      title: "2. Credit Profiling",
      desc: "Scammers query credit bureau APIs to map existing credit cards and loans.",
    };
    timelineStep3 = {
      title: "3. Synthetic Fraud",
      desc: "Attempts opening unauthorized digital credit lines or fake tax filings in your name.",
    };

    coachLesson = {
      title: "Never post PAN cards publicly; it is the master key to your credit identity.",
      why: "PAN is linked directly to your CIBIL score and bank accounts, making it a prime target for loan fraud.",
      saferVersion: "Share only sanitized copies where the central 4 characters are covered.",
      safetyTip: "Check your credit report once every 3 months to ensure no unauthorized inquiries appear.",
    };
  } else if (hasSalary) {
    threatTitle = "Compensation & Spear-Phishing Risk";
    attackerSees = "Take-home salary, employer name, and salary bank account details.";
    whatCouldHappen = "Highly targeted HR refund scams, salary redirection fraud, financial profiling.";
    personaShieldBlocked = "Bank account numbers and salary figures securely blurred.";

    timelineStep1 = {
      title: "1. Financial Profiling",
      desc: "Attacker learns your exact compensation, employer name, and salary cycle.",
    };
    timelineStep2 = {
      title: "2. Targeted Phishing",
      desc: "Attacker sends an authentic-looking WhatsApp/email pretending to be HR or Tax refund.",
    };
    timelineStep3 = {
      title: "3. Credential Capture",
      desc: "Victim is directed to a spoofed corporate login page to capture corporate passwords.",
    };

    coachLesson = {
      title: "Redact compensation and bank account numbers from employment proofs.",
      why: "External recruiters only need title and dates of employment, not your confidential banking details.",
      saferVersion: "Use the Job Application profile to mask financial amounts while keeping job titles intact.",
      safetyTip: "Always verify HR communications through internal official channels, never via SMS links.",
    };
  } else if (hasPhone && !hasAadhaar && !hasPan) {
    threatTitle = "Direct Contact & Social Engineering Risk";
    attackerSees = "Direct mobile phone number paired with personal digital artifacts.";
    whatCouldHappen = "SIM swap fraud, targeted phishing calls, WhatsApp impersonation, spam registries.";
    personaShieldBlocked = "Middle digits masked with privacy blur.";

    timelineStep1 = {
      title: "1. Phone Scraping",
      desc: "Phone number is logged and cross-referenced with truecaller/telecom leaks.",
    };
    timelineStep2 = {
      title: "2. Social Engineering",
      desc: "Attacker calls pretending to be courier, bank security, or electricity board.",
    };
    timelineStep3 = {
      title: "3. OTP Exploitation",
      desc: "Attacker manipulates victim under urgent pretext to share one-time authentication codes.",
    };

    coachLesson = {
      title: "Avoid sharing raw mobile numbers on public documents and social posts.",
      why: "Mobile numbers are the primary recipient of two-factor SMS OTPs.",
      saferVersion: "Mask central digits so only the country code and last 4 digits remain for identification.",
      safetyTip: "Switch critical accounts from SMS OTP to app-based authenticators (Google/Microsoft Authenticator).",
    };
  }

  return (
    <div className="w-full bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#1F2937] shadow-2xl space-y-6">
      {/* Top Banner: Cyber Guardian Signature */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2937]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] shrink-0 shadow-lg shadow-[#8B5CF6]/10">
            <Zap className="w-5 h-5 text-[#8B5CF6]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Cyber Guardian</h3>
              <span className="text-[10px] font-bold text-[#8B5CF6] uppercase px-2 py-0.5 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
                Signature Feature
              </span>
            </div>
            <p className="text-xs text-[#8CA3B8]">
              "If I share this image today... what could happen tomorrow?"
            </p>
          </div>
        </div>

        {/* 3 Tab Navigation */}
        <div className="flex items-center gap-1 bg-[#090B14] p-1 rounded-2xl border border-[#1F2937] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("simulator")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "simulator"
                ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30"
                : "text-[#8CA3B8] hover:text-white"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Threat Simulator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("coach")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "coach"
                ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30"
                : "text-[#8CA3B8] hover:text-white"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Privacy Coach</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("emergency")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "emergency"
                ? "bg-red-950/80 text-red-400 border border-red-500/40"
                : "text-[#8CA3B8] hover:text-white"
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Emergency Action</span>
          </button>
        </div>
      </div>

      {/* TAB 1: THREAT SIMULATOR (Visual 3-Stage Attack Chain) */}
      {activeTab === "simulator" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Quick Threat Diagnosis */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#090B14] border border-[#EF4444]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#EF4444] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
                <span>{threatTitle}</span>
              </span>
              <span className="text-[10px] font-semibold text-red-300 bg-red-950 px-2 py-0.5 rounded border border-red-500/30">
                CRITICAL CHAIN
              </span>
            </div>
            <p className="text-xs text-[#E8EEF8]">
              This document contains enough personal and security credentials to execute targeted fraud if shared unprotected.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-[#111827] border border-[#1F2937]">
                <span className="text-[#8CA3B8] block text-[10px] uppercase font-bold">What an Attacker Sees</span>
                <span className="text-white font-medium mt-0.5 block">{attackerSees}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#111827] border border-[#1F2937]">
                <span className="text-[#EF4444] block text-[10px] uppercase font-bold">What Could Happen</span>
                <span className="text-white font-medium mt-0.5 block">{whatCouldHappen}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#111827] border border-[#22C55E]/30">
                <span className="text-[#22C55E] block text-[10px] uppercase font-bold">PersonaShield Neutralized</span>
                <span className="text-[#22C55E] font-medium mt-0.5 block">{personaShieldBlocked}</span>
              </div>
            </div>
          </div>

          {/* 3-Step Interactive Attack Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              How This Information Is Usually Abused (Attack Timeline)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-[#090B14] border border-[#1F2937] space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{timelineStep1.title}</span>
                  <span className="text-[10px] font-mono text-[#8CA3B8] bg-[#111827] px-1.5 py-0.5 rounded">
                    Stage 1
                  </span>
                </div>
                <p className="text-[11px] text-[#8CA3B8] leading-relaxed">{timelineStep1.desc}</p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl bg-[#090B14] border border-amber-500/30 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">{timelineStep2.title}</span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded">
                    Stage 2
                  </span>
                </div>
                <p className="text-[11px] text-[#8CA3B8] leading-relaxed">{timelineStep2.desc}</p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl bg-[#090B14] border border-red-500/30 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400">{timelineStep3.title}</span>
                  <span className="text-[10px] font-mono text-red-400 bg-red-950 px-1.5 py-0.5 rounded">
                    Stage 3
                  </span>
                </div>
                <p className="text-[11px] text-[#8CA3B8] leading-relaxed">{timelineStep3.desc}</p>
              </div>
            </div>

            {/* Glowing Disruption Point Banner */}
            <div className="p-3.5 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/40 flex items-center justify-between gap-3 shadow-lg shadow-[#22C55E]/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#22C55E]/20 flex items-center justify-center text-[#22C55E] shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Attack Interrupted Here</span>
                  <span className="text-[11px] text-[#22C55E]">
                    PersonaShield removed the credentials and identity anchors required to continue this chain.
                  </span>
                </div>
              </div>
              <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider text-[#22C55E] bg-[#22C55E]/15 px-2.5 py-1 rounded-full border border-[#22C55E]/30 shrink-0">
                Safe to Share
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRIVACY COACH (Bite-Sized AI Cybersecurity Lesson) */}
      {activeTab === "coach" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-5 rounded-2xl bg-[#090B14] border border-[#8B5CF6]/30 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8B5CF6] uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
              <span>Today's Privacy Lesson</span>
            </div>
            <h4 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
              {coachLesson.title}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-[#111827] border border-[#1F2937] space-y-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="text-amber-400 font-extrabold">Why?</span>
                </span>
                <p className="text-[11px] text-[#8CA3B8] leading-relaxed">{coachLesson.why}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#111827] border border-[#22C55E]/30 space-y-1">
                <span className="text-xs font-bold text-[#22C55E] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Safer Version</span>
                </span>
                <p className="text-[11px] text-[#E8EEF8] leading-relaxed">{coachLesson.saferVersion}</p>
              </div>
            </div>

            {/* 30-Second Safety Tip */}
            <div className="p-3 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center gap-2.5 text-xs text-[#E8EEF8]">
              <Lock className="w-4 h-4 text-[#8B5CF6] shrink-0" />
              <div>
                <span className="font-bold text-[#A78BFA]">30-Second Safety Tip: </span>
                <span>{coachLesson.safetyTip}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EMERGENCY ACTION (Already Shared This Document?) */}
      {activeTab === "emergency" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-5 rounded-2xl bg-[#090B14] border border-red-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-[#EF4444]" />
                <h4 className="text-sm font-bold text-white">Already Shared This Document Unprotected?</h4>
              </div>
              <span className="text-[10px] font-bold text-red-300 bg-red-950 px-2 py-0.5 rounded border border-red-500/30">
                Emergency Guide
              </span>
            </div>
            <p className="text-xs text-[#8CA3B8]">
              Don't panic. Follow these official, immediate steps to freeze credentials and secure your identity:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Action 1: UIDAI Biometric Lock */}
              <div className="p-3.5 rounded-xl bg-[#111827] border border-[#1F2937] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">1. Lock Aadhaar Biometrics</span>
                  <span className="text-[10px] text-[#22C55E] bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-500/30">
                    Highest Defense
                  </span>
                </div>
                <p className="text-[11px] text-[#8CA3B8]">
                  Locks fingerprint and iris authentication so no one can verify accounts even with your full number.
                </p>
                <a
                  href="https://myaadhaar.uidai.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B5CF6] hover:text-[#A78BFA] transition-colors"
                >
                  <span>Open UIDAI Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Action 2: Credit Bureau Audit */}
              <div className="p-3.5 rounded-xl bg-[#111827] border border-[#1F2937] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">2. Check Credit Report (CIBIL)</span>
                  <span className="text-[10px] text-amber-300 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-500/30">
                    Loan Audit
                  </span>
                </div>
                <p className="text-[11px] text-[#8CA3B8]">
                  Verify whether any unauthorized digital micro-loans or credit cards were registered in your name.
                </p>
                <a
                  href="https://www.cibil.com/freecibilscore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B5CF6] hover:text-[#A78BFA] transition-colors"
                >
                  <span>Check Free Credit Score</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Action 3: Rotate Secrets */}
              <div className="p-3.5 rounded-xl bg-[#111827] border border-[#1F2937] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">3. Deactivate Compromised Keys</span>
                  <span className="text-[10px] text-red-300 bg-red-950 px-1.5 py-0.2 rounded border border-red-500/30">
                    Dev Secrets
                  </span>
                </div>
                <p className="text-[11px] text-[#8CA3B8]">
                  Immediately rotate exposed AWS/GitHub/Stripe keys in your console and revoke previous tokens.
                </p>
                <span className="text-[11px] text-[#8CA3B8] block">
                  Console $\rightarrow$ IAM $\rightarrow$ Access Keys $\rightarrow$ Make Inactive
                </span>
              </div>

              {/* Action 4: National Cybercrime Helpline 1930 */}
              <div className="p-3.5 rounded-xl bg-[#111827] border border-[#1F2937] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">4. National Cyber Helpline</span>
                  <span className="text-[10px] text-[#14B8A6] bg-teal-950 px-1.5 py-0.2 rounded border border-teal-500/30">
                    Govt Helpline
                  </span>
                </div>
                <p className="text-[11px] text-[#8CA3B8]">
                  Report financial cybercrime immediately to freeze suspect beneficiary bank accounts.
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <a
                    href="tel:1930"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#090B14] border border-[#1F2937] text-xs font-bold text-white hover:text-[#22C55E] transition-colors"
                  >
                    <PhoneCall className="w-3 h-3 text-[#22C55E]" />
                    <span>Dial 1930</span>
                  </a>
                  <a
                    href="https://cybercrime.gov.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#8B5CF6] hover:text-[#A78BFA] transition-colors"
                  >
                    <span>cybercrime.gov.in</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
