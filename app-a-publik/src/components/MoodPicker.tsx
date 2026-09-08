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
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {MOOD_OPTIONS.map((mood) => {
          const active = selected === mood;
          return (
            <button
              key={mood}
              type="button"
              onClick={() => setSelected(mood)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition
                ${
                  active
                    ? "border-brand-600 bg-brand-50 ring-2 ring-brand-500"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
            >
              <span className="text-2xl" aria-hidden>
                {MOOD_EMOJI[mood]}
              </span>
              <span className="font-medium text-slate-700">{MOOD_LABEL[mood]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
