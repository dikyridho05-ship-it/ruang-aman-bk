"use client";

import { useState } from "react";

export default function PasswordField({
  name,
  label,
  helperText,
}: {
  name: string;
  label: string;
  helperText?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="mt-1 flex items-center rounded-xl border border-slate-300 bg-white pr-2 focus-within:ring-2 focus-within:ring-brand-500">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={6}
          maxLength={72}
          autoComplete="new-password"
          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
          placeholder="Minimal 6 karakter"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="shrink-0 px-2 text-xs font-medium text-brand-700"
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        >
          {visible ? "Sembunyikan" : "Lihat"}
        </button>
      </div>
      {helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
