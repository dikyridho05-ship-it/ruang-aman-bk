import Image from "next/image";
import Link from "next/link";
import { getSekolahSettings, getLatarBeranda } from "@/lib/firestore/settings";
import { OPASITAS_LATAR_BERANDA } from "@/lib/constants/latar-beranda";
import EmergencyButton from "@/components/EmergencyButton";
import JamLayananBadge from "@/components/JamLayananBadge";

// Selalu ambil data terbaru dari Firestore — nama/logo/foto latar bisa diubah
// App B kapan saja.
export const dynamic = "force-dynamic";

/**
 * Beranda — halaman pertama setelah siswa memindai QR.
 *
 * Yang paling khas dari layanan ini bukan tombolnya, tapi cara siswa
 * dikenali: lewat Kode Konseling, bukan nama. Karena itu elemen utama
 * halaman adalah contoh kartu kode itu sendiri — siswa melihat dulu
 * "seperti inilah kamu akan dikenali", baru diajak mulai.
 */
export default async function BerandaPage() {
  const [{ namaSekolah, logoBase64 }, { fotoBase64 }] = await Promise.all([
    getSekolahSettings(),
    getLatarBeranda(),
  ]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <LatarFoto adaFoto={!!fotoBase64} />

      <header className="flex items-center gap-3 px-5 pt-5 sm:px-10 sm:pt-8">
        <Logo logoBase64={logoBase64} namaSekolah={namaSekolah} />
        <p className="min-w-0 truncate text-sm font-semibold text-tinta">{namaSekolah}</p>
      </header>

      {/* pb-28 memberi jarak aman dari tombol darurat yang melayang di pojok. */}
      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-5 pb-28 pt-10 sm:px-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 lg:pb-16">
        <div>
          <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-[-0.02em] text-tinta sm:text-[56px]">
            Cerita dulu.
            <br />
            Nama tidak perlu.
          </h1>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-tinta-soft">
            Ruang Aman adalah layanan Guru BK {namaSekolah} untuk bercerita tanpa menyebut nama,
            kelas, atau NIS. Kamu dikenali lewat kode, dan kamu yang memutuskan kapan mau bertemu
            langsung.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/curhat"
              className="rounded-xl bg-brand-600 px-7 py-4 text-center text-base font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Mulai cerita
            </Link>
            <Link
              href="/cek-balasan"
              className="rounded-xl bg-white px-7 py-4 text-center text-base font-bold text-tinta ring-1 ring-slate-300 transition-colors hover:ring-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Buka balasan
            </Link>
          </div>

          <div className="mt-6 max-w-md">
            <JamLayananBadge />
          </div>
        </div>

        <KartuKodeContoh />
      </main>

      <footer className="px-5 pb-6 sm:px-10">
        <Link href="/guru/login" className="rounded text-xs font-medium text-slate-500 hover:text-tinta hover:underline">
          Masuk sebagai Guru BK
        </Link>
      </footer>

      <EmergencyButton />
    </div>
  );
}

/**
 * Contoh kartu Kode Konseling — bentuk yang sama dengan gambar kartu yang
 * bisa disimpan siswa setelah mengirim cerita (lihat unduhKartuKode).
 * Karakter kodenya disamarkan: ini contoh, bukan kode siapa pun.
 */
function KartuKodeContoh() {
  return (
    <figure className="mx-auto w-full max-w-sm lg:mx-0 lg:justify-self-end">
      <div className="relative rounded-2xl bg-tinta px-6 pb-6 pt-5 text-white shadow-[0_24px_60px_-20px_rgba(12,35,64,0.55)]">
        <p className="text-sm text-brand-200">Kode Konseling</p>
        <p className="mt-2 font-mono text-[28px] font-bold tracking-[0.06em] sm:text-[32px]" aria-label="Contoh kode, disamarkan">
          BK-2026-<span className="text-brand-300">••••••</span>
        </p>
        {/* Sobekan karcis: dua lubang setengah lingkaran + garis putus-putus. */}
        <div className="relative my-5" aria-hidden>
          <span className="absolute -left-9 -top-3 h-6 w-6 rounded-full bg-kertas" />
          <span className="absolute -right-9 -top-3 h-6 w-6 rounded-full bg-kertas" />
          <div className="border-t border-dashed border-white/25" />
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-brand-200">Nama</dt>
            <dd className="mt-0.5 font-semibold">Tidak ditanya</dd>
          </div>
          <div>
            <dt className="text-brand-200">Kelas</dt>
            <dd className="mt-0.5 font-semibold">Tidak ditanya</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-brand-200">Dibaca oleh</dt>
            <dd className="mt-0.5 font-semibold">Guru BK sekolahmu saja</dd>
          </div>
        </dl>
      </div>
      <figcaption className="mt-3 px-1 text-sm leading-relaxed text-slate-600">
        Setelah bercerita, kamu mendapat kode seperti ini. Pakai kode itu dan password buatanmu untuk
        membuka balasan Guru BK.
      </figcaption>
    </figure>
  );
}

/**
 * Foto latar dari Pengaturan App B, ditampilkan samar di belakang konten.
 * Diambil dari endpoint gambar terpisah (`/api/latar-beranda`), bukan data
 * URL yang disisipkan di HTML — lihat catatan cache di route-nya.
 * Di HP: object-contain (foto gedung yang mendatar tetap utuh); mulai layar
 * sedang: object-cover. Gradasi tepinya ada di globals.css.
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

/** Logo sekolah, atau inisial nama sekolah kalau admin belum mengunggah logo. */
function Logo({ logoBase64, namaSekolah }: { logoBase64: string | null; namaSekolah: string }) {
  if (!logoBase64) {
    const inisial = namaSekolah
      .split(/\s+/)
      .filter((k) => /^[A-Za-z0-9]/.test(k))
      .slice(0, 2)
      .map((k) => k[0].toUpperCase())
      .join("");
    return (
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tinta text-xs font-bold text-white"
      >
        {inisial || "RA"}
      </span>
    );
  }

  return (
    <Image
      src={logoBase64}
      alt={`Logo ${namaSekolah}`}
      width={40}
      height={40}
      unoptimized
      className="h-10 w-10 shrink-0 rounded-full bg-white object-contain"
    />
  );
}
