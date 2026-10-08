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
import { getTemplateBalasan } from "@/lib/firestore/template";
import { janjiUntukTiket } from "@/lib/janji/server";
import ChatThread from "@/components/ChatThread";
import TiketTerkunci from "@/components/guru/TiketTerkunci";
import { aksesGuru, bacaPenugasan } from "@/lib/akses/aturan-tiket";
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
  const penugasan = bacaPenugasan(ticket.guruDitugaskan);

  // Kunci akses: hanya Guru BK yang ditugaskan Super Admin. Pemeriksaan ini
  // terjadi SEBELUM pesan, catatan, atau janji temu dibaca — guru lain
  // hanya menerima kode, kategori, dan waktu masuk.
  const akses = aksesGuru(penugasan, guru.uid);
  if (!akses.boleh) {
    return (
      <TiketTerkunci
        kode={kode}
        kategori={kategori}
        createdAtMs={ticket.createdAt?.toMillis?.() ?? Date.now()}
        namaGuru={akses.alasan === "guru-lain" ? akses.namaGuru : null}
      />
    );
  }

  // Begitu Guru BK membuka tiket yang masih "baru", tandai sudah dibaca.
  if (ticket.status === "baru") {
    await ticketRef.update({ status: "dibaca", updatedAt: FieldValue.serverTimestamp() });
    ticket.status = "dibaca";
  }

  const [initialMessagesResult, templates, janji] = await Promise.all([
    getMessagesForGuruAction(kode),
    getTemplateBalasan(),
    janjiUntukTiket(kode),
  ]);
  const initialMessages = initialMessagesResult.success ? initialMessagesResult.messages : [];

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

  const konteks: DataKonteksTiket = {
    kode,
    kategori,
    mood: ticket.mood,
    createdAtMs: ticket.createdAt?.toMillis?.() ?? Date.now(),
    siapBertemu: ticket.siapBertemuGuruBk === true,
    selesai: ticket.status === "selesai",
    guruUid: guru.uid,
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
        <KonteksTiket key={kode} data={konteks} />
      </aside>
    </div>
  );
}
