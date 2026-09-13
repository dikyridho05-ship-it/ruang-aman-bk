import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedGuru } from "@/lib/session/guru-session";
import { adminDb } from "@/lib/firebase/admin";
import { getPiketHariIni } from "@/lib/firestore/piket";
import LogoutButton from "@/components/LogoutButton";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import {
  KATEGORI_CURHAT_LABEL,
  MOOD_EMOJI,
  isKategoriPrioritas,
  type CurhatTicket,
  type TicketStatus,
} from "@/types/ticket";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<TicketStatus, string> = {
  baru: "bg-amber-100 text-amber-700",
  dibaca: "bg-slate-100 text-slate-700",
  dibalas: "bg-blue-100 text-blue-700",
  selesai: "bg-emerald-100 text-emerald-700",
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  baru: "Baru",
  dibaca: "Dibaca",
  dibalas: "Dibalas",
  selesai: "Selesai",
};

interface TicketRow {
  kode: string;
  kategori: CurhatTicket["kategori"];
  mood: CurhatTicket["mood"];
  judul: string;
  status: TicketStatus;
  createdAtMs: number;
  prioritas: boolean;
  guruDitugaskan: { uid: string; nama: string } | null;
}

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

  let tickets: TicketRow[] = snap.docs.map((d) => {
    const data = d.data() as CurhatTicket;
    return {
      kode: data.kode,
      kategori: data.kategori,
      mood: data.mood,
      judul: data.judul,
      status: data.status,
      createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
      prioritas: isKategoriPrioritas(data.kategori) && data.status !== "selesai",
      guruDitugaskan: data.guruDitugaskan ?? null,
    };
  });

  if (hanyaTugasSaya) {
    tickets = tickets.filter((t) => t.guruDitugaskan?.uid === guru.uid);
  }

  // Tiket prioritas (kategori berisiko tinggi, belum selesai) naik ke atas —
  // di dalam masing-masing kelompok tetap terurut dari yang paling baru.
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

      {tickets.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          {hanyaTugasSaya ? "Belum ada tiket yang ditugaskan ke kamu." : "Belum ada curhatan masuk."}
        </p>
      ) : (
        <ul className="space-y-2">
          {tickets.map((t) => (
            <li key={t.kode}>
              <Link
                href={`/guru/${t.kode}`}
                className={`flex items-center justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm hover:border-brand-300 ${
                  t.prioritas ? "border-red-300 ring-1 ring-red-100" : "border-slate-200"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-start gap-2">
                    <span aria-hidden>{MOOD_EMOJI[t.mood]}</span>
                    {/* line-clamp-2 (bukan truncate 1 baris) — judul asli siswa
                        biasanya kalimat penuh dan nyaris selalu kepotong di 1
                        baris di kartu selebar HP, padahal daftar ini alat
                        triase utama Guru BK untuk menilai mana yang mendesak
                        tanpa harus buka satu-satu. */}
                    <span className="line-clamp-2 font-semibold text-slate-900">{t.judul}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {t.kode} &middot; {KATEGORI_CURHAT_LABEL[t.kategori]} &middot;{" "}
                    {new Date(t.createdAtMs).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  {t.prioritas && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      🔴 Perlu Perhatian Segera
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {t.guruDitugaskan ? `→ ${t.guruDitugaskan.nama}` : "Belum ditugaskan"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[t.status]}`}
                >
                  {STATUS_LABEL[t.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
