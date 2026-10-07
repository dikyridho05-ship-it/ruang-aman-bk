"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { EMERGENCY_CONTACTS } from "@/lib/constants/emergency";

/**
 * Tombol darurat — selalu terlihat (fixed) di Beranda & halaman curhat.
 * Sengaja tidak butuh login/kode apa pun karena ini untuk situasi mendesak.
 *
 * Modal dilengkapi focus-trap, handler Escape, dan atribut ARIA yang sesuai.
 */
export default function EmergencyButton({
  posisi = "bawah",
}: {
  /**
   * "atas" dipakai di halaman isian bertahap: di sana tombol Lanjut/Kirim
   * berada di pojok kanan bawah, tempat tombol darurat biasanya melayang.
   */
  posisi?: "bawah" | "atas";
} = {}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Lewati efek fokus pada render pertama (mount) — cuma dipakai untuk
  // mengembalikan fokus ke tombol SOS setelah modal DITUTUP, bukan saat
  // halaman baru dimuat.
  const sudahPernahBuka = useRef(false);

  const handleClose = useCallback(() => setOpen(false), []);

  // ─── Escape untuk tutup modal + focus trap ───
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
        return;
      }

      // Focus trap: jaga agar Tab tidak keluar dari modal.
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  // ─── Fokuskan panel saat buka, kembalikan ke tombol saat tutup ───
  useEffect(() => {
    if (open) {
      sudahPernahBuka.current = true;
      const closeBtn = panelRef.current?.querySelector("button");
      closeBtn?.focus();
    } else if (sudahPernahBuka.current) {
      triggerRef.current?.focus();
    }
  }, [open]);

  return (
    <>
      {/* Sengaja cuma lingkaran ikon (bukan pill lebar dengan teks) di kondisi
          diam — versi lengkap "Butuh Bantuan Segera?" + daftar kontak darurat
          baru muncul di modal saat tombol ini diklik, supaya tombolnya tidak
          menutupi konten di belakangnya terus-menerus. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        // Teks, bukan emoji 🆘: siswa yang panik harus langsung tahu tombol
        // ini untuk apa, dan emoji tampil berbeda-beda di tiap HP.
        className={`fixed ${posisi === "atas" ? "right-4 top-3 h-10" : "bottom-4 right-4 h-12"} z-40 flex items-center gap-2 rounded-full bg-red-700 pl-3.5 pr-4
          text-sm font-bold text-white shadow-[0_6px_20px_-4px_rgba(185,28,28,0.55)]
          transition hover:bg-red-800 active:scale-95
          focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
          <path d="M5 4.5h3.2l1.6 4-2.1 1.3a11 11 0 0 0 6.5 6.5l1.3-2.1 4 1.6V19a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5Z" />
        </svg>
        Bantuan darurat
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
            bg-black/50 p-4"
          onClick={handleClose}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="emergency-dialog-title"
            aria-describedby="emergency-dialog-desc"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="emergency-dialog-title"
              className="text-lg font-bold text-slate-900"
            >
              Kamu tidak sendirian
            </h2>
            <p
              id="emergency-dialog-desc"
              className="mt-1 text-sm text-slate-600"
            >
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
                    {/* Tombol telepon cuma dirender kalau kontaknya memang
                        punya nomor yang dipastikan bisa ditelepon — mis.
                        Guru BK sekolah cuma memberi nomor WhatsApp, bukan
                        nomor yang dijamin bisa diangkat lewat panggilan
                        biasa. */}
                    {"hrefTelepon" in c && (
                      <a
                        href={c.hrefTelepon}
                        className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white
                          focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        📞 Telepon {c.telepon}
                      </a>
                    )}
                    {"hrefWhatsapp" in c && (
                      <a
                        href={c.hrefWhatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white
                          focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              onClick={handleClose}
              className="mt-4 w-full rounded-xl border border-slate-300 py-2 text-sm font-medium text-slate-700
                focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
