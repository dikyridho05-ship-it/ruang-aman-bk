"use client";

import { useState } from "react";
import { EMERGENCY_CONTACTS } from "@/lib/constants/emergency";

/**
 * Tombol darurat — selalu terlihat (fixed) di Beranda & halaman curhat.
 * Sengaja tidak butuh login/kode apa pun karena ini untuk situasi mendesak.
 */
export default function EmergencyButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Sengaja cuma lingkaran ikon (bukan pill lebar dengan teks) di kondisi
          diam — versi lengkap "Butuh Bantuan Segera?" + daftar kontak darurat
          baru muncul di modal saat tombol ini diklik, supaya tombolnya tidak
          menutupi konten di belakangnya terus-menerus. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Butuh Bantuan Segera?"
        title="Butuh Bantuan Segera?"
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center
          rounded-full bg-red-600 text-2xl text-white shadow-lg
          hover:bg-red-700 active:scale-95 transition"
      >
        <span aria-hidden>🆘</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
            bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-900">
              Kamu tidak sendirian
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Kalau situasinya darurat dan butuh bantuan sekarang juga, hubungi
              layanan resmi di bawah ini — tidak perlu menunggu balasan Guru BK.
            </p>

            <ul className="mt-4 space-y-3">
              {EMERGENCY_CONTACTS.map((c) => (
                <li
                  key={c.nama}
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <p className="font-semibold text-slate-900">{c.nama}</p>
                  <p className="text-xs text-slate-500">{c.deskripsi}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={c.hrefTelepon}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      📞 Telepon {c.telepon}
                    </a>
                    {"hrefWhatsapp" in c && (
                      <a
                        href={c.hrefWhatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        💬 WhatsApp {c.whatsapp}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-xl border border-slate-300 py-2 text-sm font-medium text-slate-700"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
