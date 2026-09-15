import Image from "next/image";
import Link from "next/link";
import { getSekolahSettings, getLatarBeranda } from "@/lib/firestore/settings";
import EmergencyButton from "@/components/EmergencyButton";

// Selalu ambil data terbaru dari Firestore — nama/logo/foto latar bisa diubah
// App B kapan saja.
export const dynamic = "force-dynamic";

/**
 * Seberapa samar foto gedung sekolah tampil di belakang Beranda. 25% dipilih
 * supaya foto masih jelas terbaca sebagai gedung sekolah, tapi kontras teks
 * di atasnya (slate-900 di atas slate-50) tetap jauh di atas ambang WCAG AA —
 * halaman ini pintu masuk siswa yang mungkin sedang tidak tenang, jadi
 * keterbacaan menang atas hiasan. Angka ini dicerminkan di pratinjau
 * app-b-admin/src/components/LatarBerandaForm.tsx.
 */
const OPASITAS_LATAR = 0.25;

export default async function BerandaPage() {
  const [{ namaSekolah, logoBase64 }, { fotoBase64 }] = await Promise.all([
    getSekolahSettings(),
    getLatarBeranda(),
  ]);

  return (
    // pb-20 (bukan py-12 simetris) supaya di HP layar pendek/lama (mis.
    // 320x568) link "Login Guru BK" di paling bawah tidak ketutupan tombol
    // "Butuh Bantuan Segera?" yang fixed — pola sama seperti CurhatFlow.tsx,
    // LupaKodeFlow.tsx & CekBalasanFlow.tsx.
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-12 pb-20">
      {/* Lapisan foto latar. `fixed` (bukan absolute) supaya di HP layar pendek
          fotonya tetap memenuhi layar tanpa ikut melar saat halaman di-scroll,
          dan aria-hidden + pointer-events-none supaya benar-benar dekorasi:
          tidak dibacakan pembaca layar, tidak pernah menghalangi tombol.
          next/image dilewati di sini karena sumbernya data URL base64 dari
          Firestore — tidak ada yang bisa dioptimasi, malah menambah lapisan. */}
      {fotoBase64 && (
        <div className="pointer-events-none fixed inset-0 -z-10 flex items-center" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* Di HP: h-auto + object-contain, jadi kotak <img> mengikuti tinggi
              asli fotonya dan tampil sebagai pita samar di tengah layar (lihat
              `items-center` di pembungkusnya). Kalau dipaksa object-cover di
              layar HP yang tinggi memanjang, foto gedung yang mendatar (±16:9)
              ikut diperbesar ~2,5x dan yang tersisa cuma potongan tengah huruf
              papan nama — gedungnya sendiri tidak kelihatan.
              Kotak <img> yang pas dengan fotonya ini juga syarat agar gradasi
              .latar-beranda-foto di globals.css benar-benar melembutkan tepi
              FOTO, bukan tepi layar. Mulai layar sedang rasionya sudah mirip,
              jadi object-cover yang paling rapi. */}
          <img
            src={fotoBase64}
            alt=""
            className="latar-beranda-foto h-auto max-h-full w-full object-contain sm:h-full sm:object-cover"
            style={{ opacity: OPASITAS_LATAR }}
          />
        </div>
      )}

      <div className="w-full max-w-md text-center">
        {logoBase64 ? (
          <Image
            src={logoBase64}
            alt={`Logo ${namaSekolah}`}
            width={80}
            height={80}
            unoptimized
            className="mx-auto rounded-full object-contain"
          />
        ) : (
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-3xl"
            aria-hidden
          >
            🏫
          </div>
        )}

        <p className="mt-3 text-sm font-medium text-slate-500">{namaSekolah}</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Ruang Aman BK</h1>
        <p className="mt-3 text-slate-600">
          Tempat curhat yang aman untuk siswa. Tanpa login, tanpa nama asli —
          Guru BK di sini siap dengar cerita kamu.
        </p>

        <Link
          href="/curhat"
          className="mt-8 block w-full rounded-xl bg-brand-600 py-3 font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          Mulai Curhat
        </Link>

        <Link
          href="/cek-balasan"
          className="mt-3 block w-full rounded-xl border border-brand-200 bg-white py-3 font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
        >
          Cek Balasan
        </Link>

        <div className="mt-8 grid grid-cols-1 gap-2 text-left text-sm text-slate-500 sm:grid-cols-3 sm:text-center">
          <div className="rounded-xl bg-slate-100 p-3">🔒 Identitas kamu tetap rahasia</div>
          <div className="rounded-xl bg-slate-100 p-3">🚫 Tidak ada rekam IP/perangkat</div>
          <div className="rounded-xl bg-slate-100 p-3">💬 Guru BK membalas lewat kode kamu</div>
        </div>

        <Link
          href="/guru/login"
          className="mt-10 inline-block text-xs font-medium text-slate-400 underline hover:text-slate-600"
        >
          Login Guru BK
        </Link>
      </div>

      <EmergencyButton />
    </main>
  );
}
