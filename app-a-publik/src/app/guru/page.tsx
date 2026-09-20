import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedGuru } from "@/lib/session/guru-session";
import { adminDb } from "@/lib/firebase/admin";
import { getPiketHariIni } from "@/lib/firestore/piket";
import LogoutButton from "@/components/LogoutButton";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { TicketListClient, type TicketRow } from "@/components/TicketListClient";
import {
  MOOD_EMOJI,
  adaKategoriPrioritas,
  labelKategori,
  normalizeKategori,
  type CurhatTicket,
  type TicketStatus,
} from "@/types/ticket";

export const dynamic = "force-dynamic";

export default async function GuruDashboardPage({
  searchParams,
}: {
  // Next.js 15: searchParams juga berupa Promise, wajib di-await.
  searchParams: Promise<{ filter?: string }>;
}) {
  const guru = await getAuthenticatedGuru();
  if (!guru) redirect("/guru/login");

  const { filter } = await searchParams;
  const hanyaTugasSaya = filter === "saya";

  const [snap, piketHariIni] = await Promise.all([
    adminDb.collection("curhatan").orderBy("createdAt", "desc").limit(50).get(),
    getPiketHariIni(),
  ]);

  const rawTickets: TicketRow[] = snap.docs.map((d) => {
    const data = d.data() as CurhatTicket;
    const kategori = normalizeKategori(data.kategori);
    return {
      kode: data.kode,
      kategori,
      mood: data.mood,
      judul: data.judul,
      status: data.status,
      createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
      prioritas: adaKategoriPrioritas(kategori) && data.status !== "selesai",
      guruDitugaskan: data.guruDitugaskan ?? null,
    };
  });

  // Kursor "Muat lebih banyak" HARUS mengikuti halaman MENTAH (sebelum
  // filter "Tugas Saya"), bukan daftar yang sudah tersaring — lihat
  // TicketListClient untuk alasannya. Dua nilai ini dihitung dari
  // rawTickets sebelum difilter, supaya klien tetap tahu persis dari mana
  // harus lanjut walau tampilan yang dikirim ke situ sudah tersaring.
  const cursorAwalMs = rawTickets.length > 0 ? rawTickets[rawTickets.length - 1].createdAtMs : null;
  const hasMoreAwal = rawTickets.length >= 50;

  const tickets: TicketRow[] = hanyaTugasSaya
    ? rawTickets.filter((t) => t.guruDitugaskan?.uid === guru.uid)
    : rawTickets;

  // Tiket prioritas (kategori berisiko tinggi, belum selesai) naik ke atas
  tickets.sort((a, b) => {
    if (a.prioritas !== b.prioritas) return a.prioritas ? -1 : 1;
    return b.createdAtMs - a.createdAtMs;
  });

  const jumlahPrioritas = tickets.filter((t) => t.prioritas).length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Daftar Curhatan</h1>
          <p className="text-sm text-slate-500">Halo, {guru.nama}</p>
        </div>
        <LogoutButton />
      </div>

      <div className="mb-4">
        <PushSubscribeButton />
      </div>

      {piketHariIni.length > 0 && (
        <p className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
          🗓️ Piket hari ini: {piketHariIni.map((g) => g.nama).join(", ")}
        </p>
      )}

      <div className="mb-4 flex gap-2">
        <Link
          href="/guru"
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            !hanyaTugasSaya
              ? "bg-brand-600 text-white"
              : "border border-slate-300 text-slate-600 hover:border-brand-300"
          }`}
        >
          Semua
        </Link>
        <Link
          href="/guru?filter=saya"
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            hanyaTugasSaya
              ? "bg-brand-600 text-white"
              : "border border-slate-300 text-slate-600 hover:border-brand-300"
          }`}
        >
          Tugas Saya
        </Link>
      </div>

      {jumlahPrioritas > 0 && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          🔴 {jumlahPrioritas} curhatan perlu perhatian segera — sudah ditaruh paling atas.
        </p>
      )}

      <TicketListClient
        initialTickets={tickets}
        guruUid={guru.uid}
        hanyaTugasSaya={hanyaTugasSaya}
        initialCursorMs={cursorAwalMs}
        initialHasMore={hasMoreAwal}
      />
    </main>
  );
}
