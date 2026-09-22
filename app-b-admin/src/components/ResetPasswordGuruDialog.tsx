"use client";

import { useEffect, useRef, useState } from "react";
import type { GuruAccount } from "@/types/admin";

/**
 * Modal "Atur Ulang Password" untuk satu akun Guru BK.
 *
 * Bergaya sama dengan ConfirmDialog (overlay bg-black/50 + panel
 * rounded-2xl shadow-xl) dan memakai pola focus-trap + Escape yang sama,
 * supaya semua modal App B terasa satu keluarga.
 *
 * Password barunya TIDAK PERNAH keluar dari komponen ini selain sebagai
 * argumen Server Action: tidak ditaruh di URL, tidak ikut router.refresh(),
 * dan dikosongkan lagi setiap kali modal dibuka/ditutup.
 */
export default function ResetPasswordGuruDialog({
  target,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  /** Akun yang sedang diatur ulang passwordnya — null berarti modal tertutup. */
  target: GuruAccount | null;
  pending: boolean;
  error: string | null;
  onSubmit: (passwordBaru: string) => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLFormElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [password, setPassword] = useState("");
  const [terlihat, setTerlihat] = useState(false);

  const open = target !== null;

  // Setiap kali modal dibuka untuk akun lain (atau ditutup), buang sisa
  // ketikan sebelumnya — jangan sampai password yang diketik untuk satu
  // guru tidak sengaja tersimpan untuk guru berikutnya.
  useEffect(() => {
    setPassword("");
    setTerlihat(false);
  }, [target?.uid]);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      panelRef.current?.querySelector("input")?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) {
        onCancel();
      }

      if (e.key === "Tab" && panelRef.current) {
        const fokusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const pertama = fokusable[0];
        const terakhir = fokusable[fokusable.length - 1];

        if (e.shiftKey && document.activeElement === pertama) {
          e.preventDefault();
          terakhir?.focus();
        } else if (!e.shiftKey && document.activeElement === terakhir) {
          e.preventDefault();
          pertama?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, pending, onCancel]);

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={pending ? undefined : onCancel}
    >
      {/* role/aria menempel di <form> itu sendiri, bukan di div di dalamnya:
          panel yang terlihat sebagai kotak dialog memang elemen form ini,
          dan pembaca layar perlu menganggap batas dialognya sama dengan
          batas yang dilihat mata. */}
      <form
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-password-title"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(password);
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
      >
        <div>
          <h2 id="reset-password-title" className="text-lg font-bold text-slate-900">
            Atur ulang password
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Password baru untuk <span className="font-semibold">{target.nama}</span> ({target.email}
            ). Sesi yang sedang berjalan miliknya dicabut, jadi dia perlu masuk lagi memakai
            password ini.
          </p>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="mt-4">
            <label
              htmlFor="password-baru"
              className="block text-xs font-medium text-slate-700"
            >
              Password Baru
            </label>
            <div className="mt-1 flex items-center rounded-xl border border-slate-300 bg-white pr-2 focus-within:ring-2 focus-within:ring-admin-500">
              <input
                id="password-baru"
                name="password-baru"
                type={terlihat ? "text" : "password"}
                required
                minLength={6}
                maxLength={100}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min. 6 karakter"
                className="min-h-[2.75rem] w-full rounded-xl px-3 py-2 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setTerlihat((v) => !v)}
                className="shrink-0 px-2 text-xs font-medium text-admin-700"
                aria-label={terlihat ? "Sembunyikan password" : "Tampilkan password"}
              >
                {terlihat ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Sampaikan password ini langsung ke guru yang bersangkutan, lalu minta dia
              menggantinya sendiri lewat &quot;Lupa password?&quot; di halaman login.
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="min-h-[2.75rem] flex-1 rounded-xl border border-slate-300 text-sm font-medium text-slate-700
                focus:outline-none focus:ring-2 focus:ring-admin-500 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={pending}
              className="min-h-[2.75rem] flex-1 rounded-xl bg-admin-600 text-sm font-semibold text-white
                focus:outline-none focus:ring-2 focus:ring-admin-500 disabled:opacity-60"
            >
              {pending ? "Menyimpan..." : "Simpan Password"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
