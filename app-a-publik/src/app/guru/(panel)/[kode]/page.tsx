import { redirect, notFound } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { getAuthenticatedGuru } from "@/lib/session/guru-session";
import { adminDb } from "@/lib/firebase/admin";
import {
  getMessagesForGuruAction,
  sendGuruReplyAction,
  markTicketSelesaiAction,
  tandaiGuruMengetikAction,
} from "@/actions/chat";
import { listGuruAktifAction, tugaskanTiketAction } from "@/actions/penugasan";
import { getTemplateBalasan } from "@/lib/firestore/template";
import { janjiUntukTiket } from "@/lib/janji/server";
import ChatThread from "@/components/ChatThread";
import HeaderTiket from "@/components/guru/HeaderTiket";
import KonteksTiket, { type DataKonteksTiket } from "@/components/guru/KonteksTiket";
import { adaKategoriPrioritas, normalizeKategori, type CurhatTicket } from "@/types/ticket";

export const dynamic = "force-dynamic";

export default async function GuruTicketDetailPage({
  params,
}: {
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

  const [initialMessagesResult, guruOptionsResult, templates, janji] = await Promise.all([
    getMessagesForGuruAction(kode),
    listGuruAktifAction(),
    getTemplateBalasan(),
    janjiUntukTiket(kode),
  ]);
  const initialMessages = initialMessagesResult.success ? initialMessagesResult.messages : [];
  const guruOptions = guruOptionsResult.success ? guruOptionsResult.guru : [];

  // Closure "use server" inline — menangkap `kode` dari params, satu-satunya
  // cara mengoper fungsi ber-parameter tambahan ke Client Component.
  async function boundSend(isi: string, gambar?: string) {
    "use server";
    return sendGuruReplyAction(kode, isi, gambar);
  }

  async function boundPoll(sejakMs?: number, terlihat?: boolean) {
    "use server";
    return getMessagesForGuruAction(kode, sejakMs, terlihat);
  }

  async function boundKetik() {
    "use server";
    return tandaiGuruMengetikAction(kode);
  }

  async function boundMarkSelesai() {
    "use server";
    return markTicketSelesaiAction(kode);
  }

  async function boundAssign(guruUid: string | null) {
    "use server";
    return tugaskanTiketAction(kode, guruUid);
  }

  const konteks: DataKonteksTiket = {
    kode,
    kategori,
    mood: ticket.mood,
    createdAtMs: ticket.createdAt?.toMillis?.() ?? Date.now(),
    siapBertemu: ticket.siapBertemuGuruBk === true,
    selesai: ticket.status === "selesai",
    guruUid: guru.uid,
    guruOptions,
    ditugaskanUid: ticket.guruDitugaskan?.uid ?? null,
    janji,
  };

  // Nama Samaran SENGAJA tidak ditampilkan di mana pun di halaman ini:
  // bersama Kode Konseling, itu persis dua faktor yang diminta
  // resetPasswordSiswaAction. Kalau keduanya tampil di satu layar, guru mana
  // pun yang membuka tiket otomatis memegang kunci untuk mengambil alih
  // akses siswa.
  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <HeaderTiket
          judul={ticket.judul}
          status={ticket.status}
          prioritas={adaKategoriPrioritas(kategori) && ticket.status !== "selesai"}
          konteks={konteks}
          onAssign={boundAssign}
          onSelesai={boundMarkSelesai}
          janjiMenunggu={janji?.status === "menunggu" && janji.menungguPihak === "guru"}
        />
        <div className="min-h-0 flex-1">
          <ChatThread
            key={kode}
            initialMessages={initialMessages}
            myRole="guru"
            onSend={boundSend}
            onPoll={boundPoll}
            onKetik={boundKetik}
            templates={templates}
            tampilkanHeader={false}
          />
        </div>
      </section>

      <aside
        aria-label="Detail curhatan"
        className="hidden min-h-0 w-80 shrink-0 overflow-y-auto rounded-xl bg-white p-4 ring-1 ring-slate-200 xl:block"
      >
        <KonteksTiket key={kode} data={konteks} onAssign={boundAssign} />
      </aside>
    </div>
  );
}
