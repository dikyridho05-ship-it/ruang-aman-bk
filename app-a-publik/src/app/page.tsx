import Image from "next/image";
import Link from "next/link";
import { getSekolahSettings, getLatarBeranda } from "@/lib/firestore/settings";
import { OPASITAS_LATAR_BERANDA } from "@/lib/constants/latar-beranda";
import EmergencyButton from "@/components/EmergencyButton";

// Selalu ambil data terbaru dari Firestore — nama/logo/foto latar bisa diubah
// App B kapan saja.
export const dynamic = "force-dynamic";

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
      <LatarFoto adaFoto={!!fotoBase64} />

      <div className="w-full max-w-md text-center">
        <Logo logoBase64={logoBase64} namaSekolah={namaSekolah} />

        {/* Nama sekolah ikut di dalam <h1> (bukan <p> terpisah sebelum judul)
            supaya pembaca layar tidak membaca teks lepas tanpa konteks
            heading sebelum judul utama. Tampilannya tetap seperti sebelumnya
            berkat kelas di masing-masing <span>. */}
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          <span className="block text-sm font-medium text-slate-500">{namaSekolah}</span>
          <span className="mt-1 block">Ruang Aman</span>
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Curhat aman &amp; rahasia bersama Guru BK.
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

        <Link
          href="/guru/login"
          className="mt-8 inline-block text-xs font-medium text-slate-400 underline hover:text-slate-600"
        >
          Login Guru BK
        </Link>
      </div>

      <EmergencyButton />
    </main>
  );
}

/**
 * Lapisan foto latar sebagai pita samar di belakang konten.
 *
 * `fixed` (bukan absolute) supaya di HP layar pendek fotonya tetap memenuhi
 * layar tanpa ikut melar saat halaman di-scroll. `pointer-events-none` +
 * `aria-hidden` supaya benar-benar dekorasi: tidak dibacakan pembaca layar,
 * tidak pernah menghalangi tombol. next/image dilewati di sini karena
 * sumbernya data URL base64 dari Firestore — tidak ada yang bisa
 * dioptimasi, malah menambah lapisan.
 *
 * Di HP: h-auto + object-contain, jadi kotak <img> mengikuti tinggi asli
 * fotonya dan tampil sebagai pita samar di tengah layar (lihat
 * `items-center` di pembungkusnya). Kalau dipaksa object-cover di layar HP
 * yang tinggi memanjang, foto gedung yang mendatar (±16:9) ikut diperbesar
 * ~2,5x dan yang tersisa cuma potongan tengah huruf papan nama — gedungnya
 * sendiri tidak kelihatan. Kotak <img> yang pas dengan fotonya ini juga
 * syarat agar gradasi .latar-beranda-foto di globals.css benar-benar
 * melembutkan tepi FOTO, bukan tepi layar. Mulai layar sedang rasionya
 * sudah mirip, jadi object-cover yang paling rapi.
 */
/**
 * Sengaja diambil dari endpoint gambar terpisah (`/api/latar-beranda`),
 * BUKAN data URL base64 disisipkan langsung di HTML halaman ini — lihat
 * catatan cache di app/api/latar-beranda/route.ts. Halaman ini cuma perlu
 * tahu SATU bit info (ada fotonya atau tidak) untuk memutuskan menampilkan
 * elemen ini sama sekali, bukan seluruh isi fotonya.
 */
function LatarFoto({ adaFoto }: { adaFoto: boolean }) {
  if (!adaFoto) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 flex items-center" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/api/latar-beranda"
        alt=""
        className="latar-beranda-foto h-auto max-h-full w-full object-contain sm:h-full sm:object-cover"
        style={{ opacity: OPASITAS_LATAR_BERANDA }}
      />
    </div>
  );
}

/** Logo sekolah, dengan fallback emoji kalau admin belum mengunggah logo. */
function Logo({
  logoBase64,
  namaSekolah,
}: {
  logoBase64: string | null;
  namaSekolah: string;
}) {
  if (!logoBase64) {
    return (
      <div
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-3xl"
        aria-hidden
      >
        🏫
      </div>
    );
  }

  return (
    <Image
      src={logoBase64}
      alt={`Logo ${namaSekolah}`}
      width={80}
      height={80}
      unoptimized
      className="mx-auto rounded-full object-contain"
    />
  );
}
