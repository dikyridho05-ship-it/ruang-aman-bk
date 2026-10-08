"use client";

import { useEffect, useRef, useState } from "react";
import {
  KATEGORI_CURHAT,
  KATEGORI_CURHAT_LABEL,
  MAKS_KATEGORI,
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

/** Berapa lama penanda "maks 3" bertahan merah setelah siswa menekan kategori berlebih. */
const DURASI_PERINGATAN_MS = 1600;

export default function KategoriPicker({
  defaultValue = [],
}: {
  defaultValue?: KategoriCurhat[];
}) {
  const [selected, setSelected] = useState<KategoriCurhat[]>(defaultValue);

  // Dinaikkan setiap kali siswa menekan kategori saat kuota sudah penuh.
  // Dipakai sebagai `key` pada penanda "maks 3" supaya animasi getarnya
  // BENAR-BENAR diulang dari awal tiap penekanan — kalau cuma mengandalkan
  // class yang ditambah/dilepas, penekanan kedua saat animasi pertama masih
  // jalan tidak terlihat bereaksi sama sekali.
  const [peringatan, setPeringatan] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const penuh = selected.length >= MAKS_KATEGORI;
  const memberiPeringatan = peringatan > 0;

  const tolak = () => {
    setPeringatan((n) => n + 1);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setPeringatan(0), DURASI_PERINGATAN_MS);
  };

  const toggle = (kategori: KategoriCurhat) => {
    setSelected((sebelumnya) => {
      if (sebelumnya.includes(kategori)) {
        // Melepas pilihan selalu boleh — sekaligus jalan keluar dari
        // keadaan penuh, jadi peringatannya ikut dipadamkan.
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setPeringatan(0);
        return sebelumnya.filter((k) => k !== kategori);
      }

      if (sebelumnya.length >= MAKS_KATEGORI) {
        tolak();
        return sebelumnya;
      }

      return [...sebelumnya, kategori];
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-medium text-slate-700">Kategori masalah</span>
        <span
          key={peringatan}
          aria-hidden
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
            memberiPeringatan
              ? "animate-getar border-red-300 bg-red-100 text-red-700"
              : penuh
                ? "border-brand-200 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          maks {MAKS_KATEGORI}
        </span>
      </div>

      {/* Satu input per kategori terpilih — dibaca di server pakai
          formData.getAll("kategori"), lihat actions/curhat.ts. */}
      {selected.map((kategori) => (
        <input key={kategori} type="hidden" name="kategori" value={kategori} />
      ))}

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {KATEGORI_CURHAT.map((kategori) => {
          const active = selected.includes(kategori);
          const terkunci = penuh && !active;
          return (
            <button
              key={kategori}
              type="button"
              onClick={() => toggle(kategori)}
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm transition
                ${
                  active
                    ? "border-brand-600 bg-brand-50 ring-2 ring-brand-500"
                    : terkunci
                      ? "border-slate-200 bg-white opacity-50"
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

      {/* Tombol yang ditolak perlu punya penjelasan, bukan cuma "tidak
          terjadi apa-apa" — dan penjelasan itu harus sampai juga ke siswa
          yang memakai pembaca layar, yang tidak melihat getaran maupun warna. */}
      <p
        role="status"
        aria-live="polite"
        className={`mt-2 text-xs ${memberiPeringatan ? "text-red-600" : "text-slate-500"}`}
      >
        {memberiPeringatan
          ? `Sudah ${MAKS_KATEGORI} kategori. Lepas salah satu dulu kalau mau ganti.`
          : "Pilih yang paling menggambarkan masalahmu — boleh lebih dari satu."}
      </p>
    </div>
  );
}
