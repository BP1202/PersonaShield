import React from "react";

export type ButtonVariant = "primary" | "secondary" | "accent" | "danger" | "ghost" | "outline";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs font-medium rounded-md",
    md: "px-4 py-2 text-sm font-medium rounded-lg",
    lg: "px-6 py-3 text-base font-semibold rounded-xl",
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      "bg-[#A855F7] hover:bg-[#9333EA] text-white shadow-lg shadow-[#A855F7]/25 active:scale-[0.98] transition-all",
    secondary:
      "bg-[#1A243F] hover:bg-[#243154] text-[#E5E7EB] border border-[#1E293B] active:scale-[0.98] transition-all",
    accent:
      "bg-[#14B8A6] hover:bg-[#0D9488] text-white shadow-lg shadow-[#14B8A6]/25 active:scale-[0.98] transition-all",
    danger:
      "bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-lg shadow-[#EF4444]/25 active:scale-[0.98] transition-all",
    outline:
      "bg-transparent hover:bg-[#121A2E] text-[#E5E7EB] border border-[#334155] active:scale-[0.98] transition-all",
    ghost:
      "bg-transparent hover:bg-[#121A2E] text-[#94A3B8] hover:text-[#E5E7EB] transition-colors",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
