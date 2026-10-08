"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { simpanKodeAksesAction, type KodeAksesAdmin } from "@/actions/akses";
import { tanggalWaktu } from "@/lib/waktu";

// Tanpa huruf/angka yang mudah tertukar saat dibacakan di kelas (0/O, 1/I/L).
const HURUF_KODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function kodeAcak(): string {
  const angka = new Uint32Array(8);
  crypto.getRandomValues(angka);
  const isi = Array.from(angka, (n) => HURUF_KODE[n % HURUF_KODE.length]).join("");
  return `${isi.slice(0, 4)}-${isi.slice(4)}`;
}

/**
 * Kode Akses Sekolah: satu kode untuk siswa, Guru BK, dan Super Admin.
 * Mengganti kode memaksa semua perangkat memasukkan kode baru — jadi
 * penggantian meminta konfirmasi dulu, langsung di dalam kartu.
 */
export default function KodeAksesForm({ initial }: { initial: KodeAksesAdmin }) {
  const router = useRouter();
  const [kode, setKode] = useState(initial.kode ?? "");
  const [aktif, setAktif] = useState(initial.aktif || !initial.kode);
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [disalin, setDisalin] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const bersih = (s: string) => s.toUpperCase().replace(/[\s-]+/g, "");
  const kodeBerubah = bersih(kode) !== bersih(initial.kode ?? "");
  const perluKonfirmasi = Boolean(initial.kode) && kodeBerubah;

  async function simpan() {
    setSaving(true);
    setMessage(null);
    const hasil = await simpanKodeAksesAction({ kode, aktif });
    setSaving(false);
    setKonfirmasi(false);
    if (!hasil.success) {
      setMessage({ type: "error", text: hasil.error });
      return;
    }
    setMessage({
      type: "success",
      text: aktif
        ? "Kode akses disimpan. Bagikan kode ini ke siswa dan Guru BK."
        : "Disimpan. Gerbang kode akses sedang mati — siapa pun bisa membuka Ruang Aman.",
    });
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (perluKonfirmasi && !konfirmasi) {
      setKonfirmasi(true);
      return;
    }
    simpan();
  }

  async function salin() {
    if (!initial.kode) return;
    try {
      await navigator.clipboard.writeText(initial.kode);
      setDisalin(true);
      setTimeout(() => setDisalin(false), 1800);
    } catch {
      // Clipboard bisa ditolak browser; kodenya tetap terlihat untuk disalin manual.
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl bg-white p-6 ring-1 ring-slate-200">
      <div>
        <h2 className="font-semibold text-slate-900">Kode Akses Sekolah</h2>
        <p className="mt-1 text-sm text-slate-500">
          Satu kode untuk semua: siswa memasukkannya sebelum bisa curhat, Guru BK sebelum login, dan
          Super Admin sebelum masuk dasbor ini. Cukup sekali per perangkat. Kode ini tidak mengenali
          siapa pun, jadi curhatan siswa tetap anonim.
        </p>
      </div>

      {initial.kode && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-kertas px-4 py-3">
          <div>
            <p className="text-xs text-slate-500">Kode yang berlaku</p>
            <p className="font-mono text-lg font-bold tracking-wider text-admin-900">{initial.kode}</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              initial.aktif ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
            }`}
          >
            {initial.aktif ? "Gerbang aktif" : "Gerbang mati"}
          </span>
          <button
            type="button"
            onClick={salin}
            className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {disalin ? "Tersalin" : "Salin kode"}
          </button>
          {initial.diubahPadaMs && (
            <p className="w-full text-xs text-slate-500">
              Terakhir diubah {tanggalWaktu(initial.diubahPadaMs)}
              {initial.diubahOleh ? ` oleh ${initial.diubahOleh}` : ""}.
            </p>
          )}
        </div>
      )}

      {!initial.kode && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Belum ada kode akses. Saat ini siapa pun yang tahu alamat Ruang Aman bisa membukanya.
        </div>
      )}

      {message && (
        <div
          role={message.type === "success" ? "status" : "alert"}
          aria-live={message.type === "success" ? "polite" : "assertive"}
          className={`rounded-xl border p-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <label htmlFor="kodeAkses" className="block text-sm font-medium text-slate-700">
          {initial.kode ? "Ganti kode" : "Kode baru"}
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="kodeAkses"
            value={kode}
            onChange={(e) => {
              setKode(e.target.value);
              setKonfirmasi(false);
            }}
            maxLength={30}
            autoComplete="off"
            spellCheck={false}
            placeholder="misalnya CIRUAS2026"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm uppercase tracking-wider outline-none focus:border-admin-500 focus:ring-2 focus:ring-admin-200"
          />
          <button
            type="button"
            onClick={() => {
              setKode(kodeAcak());
              setKonfirmasi(false);
            }}
            className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Buat acak
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          6–20 huruf atau angka. Tanda hubung dan spasi diabaikan, huruf besar/kecil sama saja.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={aktif}
          onChange={(e) => {
            setAktif(e.target.checked);
            setKonfirmasi(false);
          }}
          className="h-4 w-4 rounded border-slate-300 text-admin-600 focus:border-admin-500 focus:ring-admin-200"
        />
        Wajibkan kode akses
      </label>

      {konfirmasi && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Setelah kode diganti, <strong>semua siswa dan Guru BK</strong> harus memasukkan kode baru di
          perangkat masing-masing. Pastikan kode baru sudah siap dibagikan. Tekan simpan sekali lagi
          untuk melanjutkan.
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-admin-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Menyimpan..." : konfirmasi ? "Ya, ganti kode" : "Simpan Kode Akses"}
      </button>
    </form>
  );
}
