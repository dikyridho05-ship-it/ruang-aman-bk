// Komponen tombol standar — gunakan di seluruh aplikasi agar warna,
// radius, dan efek hover/fokus seragam dengan design system (brand-*).
import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  /** Varian warna: "primary" (default), "danger", atau "outline". */
  variant?: "primary" | "danger" | "outline";
  className?: string;
}

const VARIANT_CLASSES: Record<string, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400",
  outline:
    "border border-slate-300 text-slate-700 hover:border-brand-300 focus:ring-brand-500",
};

export const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  variant = "primary",
  disabled,
  ...rest
}) => {
  return (
    <button
      disabled={disabled}
      className={`font-semibold rounded-xl px-4 py-2
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-offset-1
        transition ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};
