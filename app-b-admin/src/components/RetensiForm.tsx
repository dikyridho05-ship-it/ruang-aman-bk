"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateRetensiSettingsAction, jalankanRetensiSekarangAction } from "@/actions/retensi";
import type { RetensiSettings } from "@/types/admin";

export default function RetensiForm({ initial }: { initial: RetensiSettings }) {
  const router = useRouter();
  const [aktif, setAktif] = useState(initial.aktif);
  const [tutupHari, setTutupHari] = useState(String(initial.tutupOtomatisHari));
  const [hapusHari, setHapusHari] = useState(String(initial.hapusOtomatisHari));
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateRetensiSettingsAction(formData);
    setSaving(false);

    if (!result.success) {
      setMessage({ type: "error", text: result.error ?? "Gagal menyimpan." });
      return;
    }
    setMessage({ type: "success", text: "Pengaturan retensi disimpan." });
    router.refresh();
  }

  async function handleJalankanSekarang() {
    setRunning(true);
    setMessage(null);
    const result = await jalankanRetensiSekarangAction();
    setRunning(false);

    if (!result.success) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setMessage({
      type: "success",
      text: `Selesai: ${result.tutupCount} tiket ditutup otomatis, ${result.hapusCount} tiket dihapus permanen.`,
    });
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="font-semibold text-slate-900">Retensi &amp; Arsip Otomatis</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tutup tiket yang tidak ada aktivitas dalam waktu lama, dan hapus permanen tiket yang
          sudah lama selesai — supaya data tidak menumpuk tanpa batas. <strong>Mati secara
          default</strong>: aktifkan hanya kalau sekolah sudah sepakat soal kebijakan ini.
        </p>
      </div>

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

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          name="aktif"
          checked={aktif}
          onChange={(e) => setAktif(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-admin-600 focus:ring-admin-500"
        />
        Aktifkan retensi otomatis
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tutupOtomatisHari" className="block text-sm font-medium text-slate-700">
            Tutup otomatis setelah (hari)
          </label>
          <input
            id="tutupOtomatisHari"
            name="tutupOtomatisHari"
            type="number"
            min={0}
            max={3650}
            value={tutupHari}
            onChange={(e) => setTutupHari(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-admin-500"
          />
          <p className="mt-1 text-xs text-slate-500">Tiket tanpa aktivitas selama ini ditandai "selesai". 0 = mati.</p>
        </div>
        <div>
          <label htmlFor="hapusOtomatisHari" className="block text-sm font-medium text-slate-700">
            Hapus permanen setelah (hari)
          </label>
          <input
            id="hapusOtomatisHari"
            name="hapusOtomatisHari"
            type="number"
            min={0}
            max={3650}
            value={hapusHari}
            onChange={(e) => setHapusHari(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-admin-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            Dihitung sejak tiket berstatus "selesai" (manual atau otomatis). 0 = mati.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-admin-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
        <button
          type="button"
          onClick={handleJalankanSekarang}
          disabled={running || !aktif}
          title={!aktif ? "Aktifkan retensi dulu untuk bisa dijalankan manual" : undefined}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          {running ? "Menjalankan..." : "Jalankan Sekarang"}
        </button>
      </div>
    </form>
  );
}
