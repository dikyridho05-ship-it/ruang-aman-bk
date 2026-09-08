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
  KATEGORI_CURHAT_LABEL,
  MOOD_EMOJI,
  MOOD_LABEL,
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
  async function boundSend(isi: string) {
    "use server";
    return sendGuruReplyAction(kode, isi);
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/guru" className="text-sm font-medium text-brand-600 hover:underline">
        &larr; Kembali ke daftar
      </Link>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span aria-hidden>{MOOD_EMOJI[ticket.mood]}</span>
              <h1 className="truncate text-lg font-bold text-slate-900">{ticket.judul}</h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {ticket.kode} &middot; {KATEGORI_CURHAT_LABEL[ticket.kategori]} &middot; Mood:{" "}
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

      <div className="mt-4">
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
