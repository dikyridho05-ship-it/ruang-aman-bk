"use client";

import { useState } from "react";
import {
  KATEGORI_CURHAT,
  KATEGORI_CURHAT_LABEL,
  type KategoriCurhat,
} from "@/types/ticket";

const KATEGORI_EMOJI: Record<KategoriCurhat, string> = {
  akademik: "📚",
  bullying: "🛡️",
  keluarga: "🏠",
  percintaan: "💌",
  teman: "🤝",
  kesehatan_mental: "🧠",
  kekerasan: "⚠️",
  lainnya: "✨",
};

export default function KategoriPicker({
  defaultValue,
}: {
  defaultValue?: KategoriCurhat;
}) {
  const [selected, setSelected] = useState<KategoriCurhat | undefined>(defaultValue);

  return (
    <div>
      <input type="hidden" name="kategori" value={selected ?? ""} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {KATEGORI_CURHAT.map((kategori) => {
          const active = selected === kategori;
          return (
            <button
              key={kategori}
              type="button"
              onClick={() => setSelected(kategori)}
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm transition
                ${
                  active
                    ? "border-brand-600 bg-brand-50 ring-2 ring-brand-500"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
            >
              <span className="text-lg" aria-hidden>
                {KATEGORI_EMOJI[kategori]}
              </span>
              <span className="font-medium text-slate-700">
                {KATEGORI_CURHAT_LABEL[kategori]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
