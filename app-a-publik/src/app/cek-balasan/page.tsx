import { getSesiSiswa } from "@/lib/session/siswa-session";
import { getMessagesForSiswaAction } from "@/actions/chat";
import { janjiUntukTiket } from "@/lib/janji/server";
import type { JanjiTemu } from "@/types/janji";
import CekBalasanFlow from "@/components/CekBalasanFlow";
import EmergencyButton from "@/components/EmergencyButton";
import type { SerializedMessage } from "@/types/ticket";

// Sesi siswa (cookie httpOnly) mesti dibaca ulang tiap kunjungan, bukan
// halaman statis yang di-cache — siapa yang sudah login berubah per orang.
export const dynamic = "force-dynamic";

/**
 * Sebelumnya halaman ini SELALU menampilkan form login, bahkan untuk siswa
 * yang baru saja berhasil verifikasi (mis. lewat "Lupa Password" — server
 * di situ sudah membuatkan sesi login, tapi CekBalasanFlow yang cuma
 * berbasis useState(false) tidak pernah tahu itu). Sekarang sesi dicek di
 * server dulu di sini, supaya siswa yang sesinya masih berlaku langsung
 * masuk ke percakapan tanpa mengetik ulang kode & password.
 */
export default async function CekBalasanPage() {
  const sesi = await getSesiSiswa();
  const kode = sesi?.kode ?? null;
  // Siswa diberi tahu bahwa ceritanya sudah diterima tapi belum ada Guru BK
  // yang ditugaskan — supaya diamnya chat tidak terbaca "tidak dipedulikan".
  const menungguPenugasan = sesi ? !sesi.data.guruDitugaskan?.uid && sesi.data.status !== "selesai" : false;

  let initialMessages: SerializedMessage[] = [];
  let janjiAwal: JanjiTemu | null = null;
  if (kode) {
    const [hasil, janji] = await Promise.all([getMessagesForSiswaAction(), janjiUntukTiket(kode)]);
    if (hasil.success) initialMessages = hasil.messages;
    janjiAwal = janji;
  }

  return (
    <main className="min-h-screen">
      <CekBalasanFlow
        initialVerified={!!kode}
        initialMessages={initialMessages}
        kodeAwal={kode}
        janjiAwal={janjiAwal}
        menungguPenugasan={menungguPenugasan}
        namaSamaranAwal={typeof sesi?.data.namaSamaran === "string" ? sesi.data.namaSamaran : null}
      />
      <EmergencyButton />
    </main>
  );
}
