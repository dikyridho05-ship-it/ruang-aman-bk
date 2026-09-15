import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { FieldValue } from "firebase-admin/firestore";
import { getAuthenticatedGuru } from "@/lib/session/guru-session";
import { adminDb } from "@/lib/firebase/admin";
import {
  getMessagesForGuruAction,
  sendGuruReplyAction,
  markTicketSelesaiAction,
} from "@/actions/chat";
import { listGuruAktifAction, tugaskanTiketAction } from "@/actions/penugasan";
import { getTemplateBalasan } from "@/lib/firestore/template";
import ChatThread from "@/components/ChatThread";
import MarkSelesaiButton from "@/components/MarkSelesaiButton";
import PenugasanTiket from "@/components/PenugasanTiket";
import {
  MOOD_EMOJI,
  MOOD_LABEL,
  labelKategori,
  normalizeKategori,
  type CurhatTicket,
} from "@/types/ticket";

export const dynamic = "force-dynamic";

export default async function GuruTicketDetailPage({
  params,
}: {
  // Next.js 15: params sekarang berupa Promise, wajib di-await.
  params: Promise<{ kode: string }>;
}) {
  const guru = await getAuthenticatedGuru();
  if (!guru) redirect("/guru/login");

  const { kode } = await params;
  const ticketRef = adminDb.collection("curhatan").doc(kode);
  const snap = await ticketRef.get();
  if (!snap.exists) notFound();

  const ticket = snap.data() as CurhatTicket;
  const kategori = normalizeKategori(ticket.kategori);

  // Begitu Guru BK membuka tiket yang masih "baru", tandai sudah dibaca.
  if (ticket.status === "baru") {
    await ticketRef.update({ status: "dibaca", updatedAt: FieldValue.serverTimestamp() });
    ticket.status = "dibaca";
  }

  const initialMessagesResult = await getMessagesForGuruAction(kode);
  const initialMessages = initialMessagesResult.success ? initialMessagesResult.messages : [];

  const guruOptionsResult = await listGuruAktifAction();
  const guruOptions = guruOptionsResult.success ? guruOptionsResult.guru : [];

  const templates = await getTemplateBalasan();

  // Closure "use server" inline — menangkap `kode` dari params. Ini SATU-SATUNYA
  // cara di Next.js supaya fungsi ber-parameter tambahan bisa dioper sebagai
  // prop callable ke Client Component (ChatThread/MarkSelesaiButton); closure
  // biasa tanpa "use server" tidak bisa melewati boundary client/server.
  async function boundSend(isi: string, gambar?: string) {
    "use server";
    return sendGuruReplyAction(kode, isi, gambar);
  }

  async function boundPoll() {
    "use server";
    return getMessagesForGuruAction(kode);
  }

  async function boundMarkSelesai() {
    "use server";
    return markTicketSelesaiAction(kode);
  }

  async function boundAssign(guruUid: string | null) {
    "use server";
    return tugaskanTiketAction(kode, guruUid);
  }

  // Sengaja "main" jadi flex-col min-h-dvh + area chat "flex-1 min-h-0" —
  // supaya ruang chat mengisi SISA tinggi layar (bukan card ketinggian
  // tetap 70vh yang kepotong), sambil kartu info tiket & penugasan di
  // atasnya tetap apa adanya. Kalau kartu info kebetulan sangat tinggi di
  // layar kecil, halaman ini yang scroll (min-h-dvh, bukan h-dvh kaku).
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6">
      <Link href="/guru" className="shrink-0 text-sm font-medium text-brand-600 hover:underline">
        &larr; Kembali ke daftar
      </Link>

      <div className="mt-3 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span aria-hidden>{MOOD_EMOJI[ticket.mood]}</span>
              <h1 className="truncate text-lg font-bold text-slate-900">{ticket.judul}</h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {ticket.kode} &middot; {labelKategori(kategori)} &middot; Mood:{" "}
              {MOOD_LABEL[ticket.mood]} &middot; Nama samaran: {ticket.namaSamaran}
            </p>
            {ticket.siapBertemuGuruBk && (
              <p className="mt-1 text-xs font-medium text-emerald-600">
                ✓ Siswa bersedia bertemu langsung dengan Guru BK
              </p>
            )}
          </div>

          {ticket.status !== "selesai" && <MarkSelesaiButton action={boundMarkSelesai} />}
        </div>

        <div className="mt-3 border-t border-slate-100 pt-3">
          <PenugasanTiket
            guruOptions={guruOptions}
            currentUid={ticket.guruDitugaskan?.uid ?? null}
            onAssign={boundAssign}
          />
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 pb-4">
        <ChatThread
          initialMessages={initialMessages}
          myRole="guru"
          onSend={boundSend}
          onPoll={boundPoll}
          templates={templates}
        />
      </div>
    </main>
  );
}
