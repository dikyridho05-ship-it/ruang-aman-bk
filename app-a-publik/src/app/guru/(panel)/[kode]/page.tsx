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

  return (
    // Satu kartu setinggi kolom tengah: bilah info tiket yang diam di atas,
    // ruang chat mengisi sisanya. "min-h-0" di pembungkus chat wajib ada —
    // tanpa itu tinggi minimum bawaan item flex adalah setinggi isinya,
    // jadi daftar pesan menolak menyusut dan kotak ketik terdorong ke luar
    // layar begitu percakapannya panjang.
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="shrink-0 border-b border-slate-100 p-3 sm:p-4">
        <div className="flex items-start gap-3">
          {/* Di HP kolom daftar disembunyikan selama tiket terbuka, jadi
              tautan ini satu-satunya jalan kembali ke antrean. Mulai lg
              daftarnya sudah terlihat permanen di kiri. */}
          <Link
            href="/guru"
            aria-label="Kembali ke daftar curhatan"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500
              hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-brand-500 lg:hidden"
          >
            <span aria-hidden className="text-lg leading-none">
              &larr;
            </span>
          </Link>

          <span
            aria-hidden
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg sm:flex"
          >
            {MOOD_EMOJI[ticket.mood]}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-base font-bold text-slate-900 sm:truncate">{ticket.judul}</h2>
            <p className="truncate text-xs text-slate-500">
              {ticket.kode} &middot; {labelKategori(kategori)} &middot; Mood:{" "}
              {MOOD_LABEL[ticket.mood]}
            </p>
            {/* Nama Samaran SENGAJA tidak ditampilkan di sini: bersama Kode
                Konseling (sudah terlihat di baris atas), itu persis dua
                faktor yang diminta resetPasswordSiswaAction (lihat
                actions/lupa-password.ts). Kalau keduanya tampil di satu
                layar, guru mana pun yang membuka tiket otomatis memegang
                kunci untuk mengambil alih akses siswa. */}
            {ticket.siapBertemuGuruBk && (
              <p className="mt-0.5 truncate text-xs font-medium text-emerald-600">
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

      {/* tampilkanHeader={false}: bilah info tiket di atas sudah berperan
          sebagai judul percakapan — bilah "Siswa (Anonim)" bawaan
          ChatThread di bawahnya cuma menumpuk dua judul. */}
      <div className="min-h-0 flex-1">
        <ChatThread
          initialMessages={initialMessages}
          myRole="guru"
          onSend={boundSend}
          onPoll={boundPoll}
          templates={templates}
          tampilkanHeader={false}
        />
      </div>
    </div>
  );
}
