import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { adminDb } from "@/lib/firebase/admin";
import { tanggalWaktu } from "@/lib/waktu";
import BukaIsiChat from "@/components/BukaIsiChat";

export const dynamic = "force-dynamic";

/**
 * Halaman ini TIDAK pernah membaca isi curhatan. Yang dibaca hanya penanda
 * `dibukaAdmin`. Isi chat baru diambil lewat bukaIsiChatSekaliAction setelah
 * Super Admin menulis alasan dan mengonfirmasi — lihat actions/buka-chat.ts.
 */
export default async function BukaChatPage({ params }: { params: Promise<{ kode: string }> }) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) redirect("/login");

  const { kode: kodeMentah } = await params;
  const kode = decodeURIComponent(kodeMentah).toUpperCase();
  if (!/^[A-Z0-9-]{4,40}$/.test(kode)) notFound();

  const [snap] = await adminDb.getAll(adminDb.collection("curhatan").doc(kode), {
    fieldMask: ["dibukaAdmin"],
  });
  if (!snap.exists) notFound();
  const dibuka = snap.data()?.dibukaAdmin as
    | { nama?: string; alasan?: string; waktu?: { toMillis?: () => number } }
    | undefined;

  return (
    <main className="max-w-3xl">
      <Link href="/curhatan" className="text-sm font-semibold text-admin-700 hover:underline">
        ← Kembali ke Curhatan
      </Link>

      {dibuka ? (
        <section className="mt-4 rounded-xl bg-white p-6 ring-1 ring-slate-200">
          <h2 className="font-semibold text-slate-900">Isi chat sudah pernah dibuka</h2>
          <p className="mt-1 text-sm text-slate-600">
            Isi chat curhatan <span className="font-mono font-semibold">{kode}</span> hanya bisa dibuka
            Super Admin satu kali, dan kesempatan itu sudah dipakai.
          </p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-slate-500">Dibuka oleh</dt>
            <dd className="text-slate-800">{dibuka.nama ?? "Super Admin"}</dd>
            <dt className="text-slate-500">Waktu</dt>
            <dd className="text-slate-800">
              {dibuka.waktu?.toMillis ? tanggalWaktu(dibuka.waktu.toMillis()) : "—"}
            </dd>
            <dt className="text-slate-500">Alasan</dt>
            <dd className="text-slate-800">{dibuka.alasan ?? "—"}</dd>
          </dl>
        </section>
      ) : (
        <BukaIsiChat kode={kode} />
      )}
    </main>
  );
}
