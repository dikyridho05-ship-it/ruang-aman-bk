"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { ajukanAksesAdminAction, loginAdminAction } from "@/actions/auth";
import { PERAN_PEMOHON } from "@/types/admin";
import { keluarFirebase, masukDenganGoogle, pesanGalatGoogle } from "@/lib/firebase/masuk-google";
import { LogoGoogle } from "@/components/Ikon";
import { KotakPesan } from "@/components/auth/AuthBingkai";

type Tahap = "akun" | "data" | "terkirim";

const LANGKAH: { tahap: Tahap; label: string }[] = [
  { tahap: "akun", label: "Pilih akun Google" },
  { tahap: "data", label: "Isi nama & peran" },
  { tahap: "terkirim", label: "Tunggu persetujuan" },
];

/**
 * Pengajuan akses Super Admin. Hasil akhirnya BUKAN akun aktif, melainkan
 * permintaan yang harus disetujui Super Admin yang sudah ada — halaman ini
 * mengatakannya sejak awal supaya pemohon tidak bingung kenapa belum bisa
 * langsung masuk.
 */
export default function FormDaftar({ namaSekolah }: { namaSekolah: string }) {
  const router = useRouter();
  const [tahap, setTahap] = useState<Tahap>("akun");
  const [user, setUser] = useState<User | null>(null);
  const [nama, setNama] = useState("");
  const [peran, setPeran] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [sudahMenunggu, setSudahMenunggu] = useState(false);

  async function pilihAkun() {
    setGalat(null);
    setSibuk(true);
    try {
      const u = await masukDenganGoogle();
      if (!u) return;

      // Kalau akun ini ternyata sudah Super Admin, langsung masukkan saja.
      const cek = await loginAdminAction(await u.getIdToken());
      if (cek.success) {
        router.push("/");
        router.refresh();
        return;
      }
      if (cek.alasan === "menunggu") {
        await keluarFirebase();
        setUser(u);
        setSudahMenunggu(true);
        setTahap("terkirim");
        return;
      }
      if (cek.alasan === "nonaktif") {
        await keluarFirebase();
        setGalat(cek.error);
        return;
      }

      setUser(u);
      setNama(u.displayName ?? "");
      setTahap("data");
    } catch (err) {
      console.error("[FormDaftar] Google gagal:", err);
      setGalat(pesanGalatGoogle(err));
    } finally {
      setSibuk(false);
    }
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setGalat(null);
    setSibuk(true);
    try {
      const hasil = await ajukanAksesAdminAction(await user.getIdToken(), { nama, peran });
      if (!hasil.success) {
        setGalat(hasil.error);
        return;
      }
      if (hasil.status === "sudah-admin") {
        router.push("/login");
        return;
      }
      await keluarFirebase();
      setTahap("terkirim");
    } catch (err) {
      console.error("[FormDaftar] kirim gagal:", err);
      setGalat("Permintaan gagal dikirim. Periksa koneksi lalu coba lagi.");
    } finally {
      setSibuk(false);
    }
  }

  async function gantiAkun() {
    await keluarFirebase();
    setUser(null);
    setNama("");
    setPeran("");
    setTahap("akun");
  }

  const idxAktif = LANGKAH.findIndex((l) => l.tahap === tahap);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-admin-900">Ajukan akses</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        Untuk pengelola {namaSekolah}. Akses aktif setelah disetujui Super Admin yang sudah ada.
      </p>

      <ol className="mt-6 flex gap-2" aria-label="Langkah pengajuan">
        {LANGKAH.map((l, i) => (
          <li key={l.tahap} className="flex-1" aria-current={i === idxAktif ? "step" : undefined}>
            <span
              className={`block h-1 rounded-full ${i <= idxAktif ? "bg-admin-700" : "bg-slate-200"}`}
            />
            <span
              className={`mt-2 block text-xs leading-snug ${
                i === idxAktif ? "font-semibold text-admin-900" : "text-slate-500"
              }`}
            >
              {i + 1}. {l.label}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-7 space-y-4">
        {galat && <KotakPesan jenis="galat">{galat}</KotakPesan>}

        {tahap === "akun" && (
          <>
            <button
              type="button"
              onClick={pilihAkun}
              disabled={sibuk}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white py-3 text-[15px] font-semibold text-slate-800 transition-colors hover:border-admin-300 hover:bg-admin-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500 disabled:opacity-60"
            >
              <LogoGoogle />
              {sibuk ? "Menghubungkan ke Google…" : "Lanjut dengan Google"}
            </button>
            <p className="text-xs leading-relaxed text-slate-500">
              Kami hanya memakai nama dan alamat email dari akun Google-mu. Password Google tidak
              pernah sampai ke aplikasi ini.
            </p>
          </>
        )}

        {tahap === "data" && user && (
          <form onSubmit={kirim} className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3.5 py-3 ring-1 ring-slate-200">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Akun Google</p>
                <p className="truncate text-sm font-semibold text-slate-900">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={gantiAkun}
                className="shrink-0 rounded text-xs font-semibold text-admin-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500"
              >
                Ganti
              </button>
            </div>

            <div>
              <label htmlFor="nama" className="block text-sm font-medium text-slate-700">
                Nama lengkap
              </label>
              <input
                id="nama"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-admin-500 focus:ring-2 focus:ring-admin-200"
              />
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-slate-700">Peranmu di sekolah</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PERAN_PEMOHON.map((p) => (
                  <label
                    key={p}
                    className={`flex cursor-pointer items-center rounded-lg border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-admin-500 ${
                      peran === p
                        ? "border-admin-700 bg-admin-50 font-semibold text-admin-900"
                        : "border-slate-300 bg-white text-slate-700 hover:border-admin-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="peran"
                      value={p}
                      required
                      checked={peran === p}
                      onChange={() => setPeran(p)}
                      className="sr-only"
                    />
                    {p}
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={sibuk}
              className="w-full rounded-lg bg-admin-800 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-admin-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {sibuk ? "Mengirim…" : "Kirim permintaan akses"}
            </button>
          </form>
        )}

        {tahap === "terkirim" && (
          <div className="rounded-lg bg-white p-5 ring-1 ring-slate-200">
            <p className="font-semibold text-admin-900">
              {sudahMenunggu ? "Permintaanmu masih menunggu" : "Permintaan akses terkirim"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {user?.email ? <span className="font-medium text-slate-800">{user.email}</span> : "Akunmu"}{" "}
              akan bisa masuk setelah Super Admin {namaSekolah} menyetujuinya di menu Akun Super Admin.
              Kabari mereka supaya permintaanmu cepat diproses.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block rounded text-sm font-semibold text-admin-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500"
            >
              Kembali ke halaman masuk
            </Link>
          </div>
        )}
      </div>

      {tahap !== "terkirim" && (
        <p className="mt-8 border-t border-slate-200 pt-5 text-sm text-slate-600">
          Sudah punya akses?{" "}
          <Link href="/login" className="font-semibold text-admin-700 underline-offset-2 hover:underline">
            Masuk
          </Link>
        </p>
      )}
    </div>
  );
}
