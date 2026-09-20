import { getAuthenticatedSiswaKode } from "@/lib/session/siswa-session";
import { getMessagesForSiswaAction } from "@/actions/chat";
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
  const kode = await getAuthenticatedSiswaKode();

  let initialMessages: SerializedMessage[] = [];
  if (kode) {
    const hasil = await getMessagesForSiswaAction();
    if (hasil.success) initialMessages = hasil.messages;
  }

  return (
    <main className="min-h-screen">
      <CekBalasanFlow initialVerified={!!kode} initialMessages={initialMessages} />
      <EmergencyButton />
    </main>
  );
}
