import React, { useState } from "react";
import { X, Stamp, Check } from "lucide-react";
import { Button } from "../common/Button";

interface PurposeWatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWatermark?: string;
  onApplyWatermark: (watermarkText: string | null) => void;
}

export const PurposeWatermarkModal: React.FC<PurposeWatermarkModalProps> = ({
  isOpen,
  onClose,
  currentWatermark,
  onApplyWatermark,
}) => {
  const defaultDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const [purpose, setPurpose] = useState("Apartment Rental");
  const [recipient, setRecipient] = useState("ABC Builders");
  const [date, setDate] = useState(defaultDate);

  const presetPurposes = [
    "Apartment Rental",
    "Bank KYC Only",
    "Job Application",
    "Hotel Check-in",
    "SIM Registration",
  ];

  if (!isOpen) return null;

  const generatedText = `ONLY FOR ${recipient.trim().toUpperCase()} — ${purpose.trim().toUpperCase()} — ${date.trim().toUpperCase()}`;

  const handleApply = () => {
    if (!recipient.trim() || !purpose.trim()) {
      return;
    }
    onApplyWatermark(generatedText);
    onClose();
  };

  const handleRemove = () => {
    onApplyWatermark(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#111827] rounded-3xl p-6 sm:p-7 border border-[#1F2937] shadow-2xl max-w-md w-full space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444]">
              <Stamp className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Add Purpose Protection Stamp
              </h4>
              <p className="text-[11px] text-[#8CA3B8]">
                Prevents unauthorized reuse of your identity photocopy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#8CA3B8] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-[#8CA3B8] font-semibold">Quick Purpose Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {presetPurposes.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurpose(p)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    purpose === p
                      ? "bg-[#8B5CF6] text-white"
                      : "bg-[#090B14] border border-[#1F2937] text-[#8CA3B8] hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Input */}
          <div className="space-y-1">
            <label htmlFor="recipient-input" className="text-[#E8EEF8] font-semibold">
              Recipient / Organization:
            </label>
            <input
              id="recipient-input"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. ABC Builders / HDFC Bank / TechCorp HR"
              className="w-full px-3 py-2 rounded-xl bg-[#090B14] border border-[#1F2937] text-white focus:border-[#8B5CF6] focus:outline-hidden"
            />
          </div>

          {/* Custom Purpose Input */}
          <div className="space-y-1">
            <label htmlFor="purpose-input" className="text-[#E8EEF8] font-semibold">
              Purpose Description:
            </label>
            <input
              id="purpose-input"
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Apartment Rental Agreement"
              className="w-full px-3 py-2 rounded-xl bg-[#090B14] border border-[#1F2937] text-white focus:border-[#8B5CF6] focus:outline-hidden"
            />
          </div>

          {/* Date Input */}
          <div className="space-y-1">
            <label htmlFor="date-input" className="text-[#E8EEF8] font-semibold">
              Date / Expiry:
            </label>
            <input
              id="date-input"
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090B14] border border-[#1F2937] text-white focus:border-[#8B5CF6] focus:outline-hidden font-mono"
            />
          </div>

          {/* Live Preview of Watermark */}
          <div className="p-3.5 rounded-2xl bg-[#090B14] border border-[#EF4444]/30 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-[#8CA3B8] block">
              Anti-Fraud Watermark Stamp Preview:
            </span>
            <div className="p-2.5 rounded-xl bg-[#111827] border border-[#1F2937] text-center font-mono font-bold text-[11px] text-[#EF4444] tracking-wider uppercase select-none">
              {generatedText}
            </div>
            <p className="text-[10px] text-[#8CA3B8]">
              UIDAI & RBI recommend adding purpose watermarks so fraudsters cannot open unauthorized accounts using this photocopy.
            </p>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {currentWatermark ? (
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
            >
              Remove Stamp
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleApply}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Apply Purpose Stamp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
