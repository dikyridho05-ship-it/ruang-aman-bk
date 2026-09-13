"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateSekolahSettingsAction } from "@/actions/settings";

interface PengaturanFormProps {
  initialNamaSekolah: string;
  initialLogoBase64: string | null;
}

export default function PengaturanForm({
  initialNamaSekolah,
  initialLogoBase64,
}: PengaturanFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [namaSekolah, setNamaSekolah] = useState(initialNamaSekolah);
  const [preview, setPreview] = useState<string | null>(initialLogoBase64);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const MAX_LOGO_BYTES = 300 * 1024;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Cek ukuran DI SINI juga (bukan cuma di server) — file foto dari HP
    // gampang beberapa MB, dan request sebesar itu bisa gagal di tengah
    // jalan sebelum sempat divalidasi server (lihat bug tombol nyangkut di
    // bawah). Lebih baik langsung kasih tahu & batalkan pemilihan file,
    // daripada nunggu upload lambat cuma buat gagal di akhir.
    if (file.size > MAX_LOGO_BYTES) {
      setMessage({
        type: "error",
        text: `Ukuran logo ${(file.size / 1024).toFixed(0)} KB, melebihi batas 300 KB. Pilih file lain atau perkecil dulu.`,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await updateSekolahSettingsAction(formData);

      if (!result.success) {
        setMessage({ type: "error", text: result.error ?? "Gagal menyimpan." });
        return;
      }

      setMessage({ type: "success", text: "Pengaturan berhasil disimpan." });
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      // Sebelumnya: kalau baris di atas gagal (koneksi putus, request
      // ditolak server karena kebesaran, dll), tombol "Menyimpan..." nyangkut
      // selamanya karena tidak ada try/catch — setSaving(false) di bawah
      // tidak pernah kejalan. Ini yang bikin tombolnya "tidak bisa" dipakai.
      setMessage({
        type: "error",
        text: "Gagal menyimpan — coba lagi. Kalau logonya berukuran besar, coba perkecil dulu.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {message && (
        <div
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
        <label htmlFor="namaSekolah" className="block text-sm font-medium text-slate-700">
          Nama Sekolah
        </label>
        <input
          id="namaSekolah"
          name="namaSekolah"
          required
          value={namaSekolah}
          onChange={(e) => setNamaSekolah(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-admin-500"
        />
        <p className="mt-1 text-xs text-slate-500">Tampil di Beranda portal siswa (App A).</p>
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700">Logo Sekolah</span>
        <div className="mt-2 flex items-center gap-4">
          {preview ? (
            <img
              src={preview}
              alt="Preview logo"
              className="h-16 w-16 rounded-full border border-slate-200 object-contain"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl">
              🏫
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-admin-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-admin-700"
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          PNG/JPEG/WebP, maksimal 300 KB. Kosongkan kalau tidak mau ganti logo.
        </p>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-admin-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Menyimpan..." : "Simpan Pengaturan"}
      </button>
    </form>
  );
}
