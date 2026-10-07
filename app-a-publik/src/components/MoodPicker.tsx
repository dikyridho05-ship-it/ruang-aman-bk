"use client";

import { useState } from "react";
import { MOOD_OPTIONS, MOOD_EMOJI, MOOD_LABEL, type Mood } from "@/types/ticket";

/**
 * Mood meter — nilainya dikirim lewat hidden input "mood" supaya tetap jalan
 * sebagai bagian dari <form action={...}> biasa (Server Action).
 */
export default function MoodPicker({
  defaultValue,
}: {
  defaultValue?: Mood;
}) {
  const [selected, setSelected] = useState<Mood | undefined>(defaultValue);

  return (
    <div>
      <input type="hidden" name="mood" value={selected ?? ""} />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="group" aria-label="Perasaanmu sekarang">
        {MOOD_OPTIONS.map((mood) => {
          const active = selected === mood;
          return (
            <button
              key={mood}
              type="button"
              onClick={() => setSelected(mood)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1 rounded-xl py-3 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
                ${active ? "bg-tinta text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-brand-400"}`}
            >
              <span className="text-2xl" aria-hidden>
                {MOOD_EMOJI[mood]}
              </span>
              <span className="font-semibold">{MOOD_LABEL[mood]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
