import Image from "next/image";
import Link from "next/link";
import { getSekolahSettings } from "@/lib/firestore/settings";
import EmergencyButton from "@/components/EmergencyButton";

// Selalu ambil data terbaru dari Firestore — nama/logo bisa diubah App B kapan saja.
export const dynamic = "force-dynamic";

export default async function BerandaPage() {
  const { namaSekolah, logoBase64 } = await getSekolahSettings();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
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
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Ruang Aman</h1>
        <p className="mt-3 text-slate-600">
          Tempat curhat yang aman untuk siswa.
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
          Login Sebagai Guru BK
        </Link>
      </div>

      <EmergencyButton />
    </main>
  );
}
