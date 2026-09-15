"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { simpanLatarBerandaAction, hapusLatarBerandaAction } from "@/actions/latar-beranda";
import { kompresFotoLatarKeDataUrl } from "@/lib/image/kompres-foto";
import { OPASITAS_LATAR_BERANDA } from "@/lib/constants/latar-beranda";

interface Props {
  initialFotoBase64: string | null;
}

export default function LatarBerandaForm({ initialFotoBase64 }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialFotoBase64);
  const [fotoBaru, setFotoBaru] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState<"kompres" | "simpan" | "hapus" | null>(null);
  const [pesan, setPesan] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPesan(null);
    setSibuk("kompres");
    try {
      // Dikompres dulu di browser, baru dikirim. Foto dari HP gampang 3-5MB
      // dan request sebesar itu sering putus di tengah jalan sebelum server
      // sempat menolaknya — pola yang sama sudah dipakai untuk logo sekolah.
      const dataUrl = await kompresFotoLatarKeDataUrl(file);
      setFotoBaru(dataUrl);
      setPreview(dataUrl);
    } catch (err) {
      setPesan({
        type: "error",
        text: err instanceof Error ? err.message : "Gagal memproses foto.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setSibuk(null);
    }
  }

  async function handleSimpan() {
    if (!fotoBaru) return;
    setSibuk("simpan");
    setPesan(null);
    try {
      const hasil = await simpanLatarBerandaAction(fotoBaru);
      if (!hasil.success) {
        setPesan({ type: "error", text: hasil.error ?? "Gagal menyimpan." });
        return;
      }
      setFotoBaru(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPesan({ type: "success", text: "Foto latar Beranda berhasil disimpan." });
      router.refresh();
    } catch {
      setPesan({ type: "error", text: "Gagal menyimpan — coba lagi." });
    } finally {
      setSibuk(null);
    }
  }

  async function handleHapus() {
    setSibuk("hapus");
    setPesan(null);
    try {
      const hasil = await hapusLatarBerandaAction();
      if (!hasil.success) {
        setPesan({ type: "error", text: hasil.error ?? "Gagal menghapus." });
        return;
      }
      setPreview(null);
      setFotoBaru(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPesan({ type: "success", text: "Foto latar dihapus. Beranda kembali polos." });
      router.refresh();
    } catch {
      setPesan({ type: "error", text: "Gagal menghapus — coba lagi." });
    } finally {
      setSibuk(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Foto Latar Beranda</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Foto gedung sekolah yang tampil samar di belakang halaman depan portal siswa.
          Kosongkan kalau mau Beranda tetap polos.
        </p>
      </div>

      {pesan && (
        <div
          role={pesan.type === "success" ? "status" : "alert"}
          aria-live={pesan.type === "success" ? "polite" : "assertive"}
          className={`rounded-xl border p-3 text-sm ${
            pesan.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {pesan.text}
        </div>
      )}

      {/* Pratinjau sengaja meniru tampilan aslinya (foto pada opasitas 25% di
          atas latar terang + teks contoh), bukan menampilkan foto utuh —
          supaya Super Admin bisa langsung menilai apakah tulisannya masih
          terbaca sebelum menyimpan. Foto yang gelap/ramai sering baru
          ketahuan bermasalah setelah dilihat seperti ini. */}
      <div className="relative h-40 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
              style={{ opacity: OPASITAS_LATAR_BERANDA }}
            />
            <div className="relative flex h-full flex-col items-center justify-center text-center">
              <p className="text-xs font-medium text-slate-500">Nama Sekolah</p>
              <p className="text-lg font-bold text-slate-900">Ruang Aman BK</p>
              {/* Warna tombol ditulis literal, bukan kelas Tailwind: ini meniru
                  warna brand App A (brand-600 = #0284c7), sementara palet
                  Tailwind App B sengaja ungu (admin-*) supaya dashboard internal
                  gampang dibedakan dari portal siswa. */}
              <span
                className="mt-2 rounded-lg px-4 py-1.5 text-xs font-semibold text-white"
                style={{ backgroundColor: "#0284c7" }}
              >
                Mulai Curhat
              </span>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Belum ada foto latar
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          disabled={sibuk !== null}
          className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-admin-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-admin-700"
        />
        {sibuk === "kompres" && (
          <span className="text-xs text-slate-500">Memproses foto...</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSimpan}
          disabled={!fotoBaru || sibuk !== null}
          className="rounded-xl bg-admin-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {sibuk === "simpan" ? "Menyimpan..." : "Simpan Foto Latar"}
        </button>
        {preview && (
          <button
            type="button"
            onClick={handleHapus}
            disabled={sibuk !== null}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50"
          >
            {sibuk === "hapus" ? "Menghapus..." : "Hapus Foto"}
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Foto otomatis diperkecil & dikompres di perangkat ini sebelum dikirim, jadi
        boleh langsung pakai foto dari HP. Pilih foto yang terang & tidak terlalu
        ramai supaya tulisan di Beranda tetap terbaca.
      </p>
    </section>
  );
}
