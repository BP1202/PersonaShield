import React from "react";
import { CreditCard, FileText, Globe, Receipt, Ticket, Smartphone } from "lucide-react";

export const SupportedFormats: React.FC = () => {
  const documents = [
    { name: "Aadhaar Card", desc: "Identity & address card", icon: CreditCard },
    { name: "PAN Card", desc: "Tax identification card", icon: FileText },
    { name: "Passport", desc: "Travel & identity document", icon: Globe },
    { name: "Invoice / Receipt", desc: "Financial billing & GST bills", icon: Receipt },
    { name: "Flight / Train Ticket", desc: "Boarding pass & PNR details", icon: Ticket },
    { name: "App Screenshot", desc: "Chat, payment & dev tokens", icon: Smartphone },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[#8CA3B8]">
        <span className="font-semibold text-white uppercase tracking-wider">
          Supported Documents & Scenarios
        </span>
        <span>PNG, JPG, WebP, PDF (Max 10 MB)</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {documents.map(({ name, desc, icon: Icon }) => (
          <div
            key={name}
            className="flex flex-col justify-between p-3 rounded-2xl bg-[#111827] border border-[#1F2937] hover:border-[#8B5CF6]/50 transition-all hover:bg-[#162032]/60"
          >
            <div className="p-2 rounded-xl bg-[#090B14] text-[#8B5CF6] w-fit mb-2">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-white leading-tight">{name}</div>
              <div className="text-[10px] text-[#8CA3B8] mt-0.5 leading-snug">{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
