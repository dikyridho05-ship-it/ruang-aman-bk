import { redirect } from "next/navigation";
import { getAuthenticatedGuru } from "@/lib/session/guru-session";
import { adminDb } from "@/lib/firebase/admin";
import { getPiketHariIni } from "@/lib/firestore/piket";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import GuruShell from "@/components/guru/GuruShell";
import DaftarCurhatan from "@/components/guru/DaftarCurhatan";
import PanelSamping from "@/components/guru/PanelSamping";
import {
  adaKategoriPrioritas,
  normalizeKategori,
  type CurhatTicket,
  type TicketRow,
} from "@/types/ticket";

export const dynamic = "force-dynamic";

/**
 * Layout panel Guru BK — dipakai bersama oleh /guru (belum ada tiket
 * terpilih) dan /guru/{kode} (satu tiket terbuka).
 *
 * Daftar curhatan & panel samping sengaja diambil DI SINI, bukan di
 * masing-masing halaman: di App Router layout tidak dirender ulang saat
 * berpindah antar halaman anaknya, jadi guru bisa meloncat dari satu
 * curhatan ke curhatan berikutnya tanpa daftar di kiri berkedip dan
 * membongkar posisi gulungannya. Perubahan status tiket (mis. "baru" jadi
 * "dibaca" begitu dibuka) tetap tersusul karena halaman tiket memanggil
 * router.refresh(), yang menyegarkan layout ini sekalian.
 *
 * Halaman /guru/login sengaja TIDAK ikut layout ini — dia ada di luar
 * route group "(panel)" supaya tetap bisa diakses tanpa sesi.
 */
export default async function GuruPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const guru = await getAuthenticatedGuru();
  if (!guru) redirect("/guru/login");

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

  // Kursor "Muat lebih banyak" mengikuti halaman MENTAH ini apa adanya —
  // penyaringan & pengurutan semuanya terjadi di sisi klien (lihat
  // DaftarCurhatan), jadi angka ini harus tetap menunjuk ke tiket terlama
  // yang SUNGGUH sudah diambil dari Firestore, bukan yang terlihat.
  const cursorAwalMs =
    rawTickets.length > 0 ? rawTickets[rawTickets.length - 1].createdAtMs : null;
  const hasMoreAwal = rawTickets.length >= 50;

  return (
    <GuruShell
      guruNama={guru.nama}
      daftar={
        <DaftarCurhatan
          initialTickets={rawTickets}
          guruUid={guru.uid}
          initialCursorMs={cursorAwalMs}
          initialHasMore={hasMoreAwal}
          panelRingkas={
            <>
              <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <PushSubscribeButton />
              </div>
              {/* Di bawah xl panel kanan tidak muat; isinya yang paling
                  penting tetap ikut, dalam bentuk dua baris padat. */}
              <div className="shrink-0 xl:hidden">
                <PanelSamping piket={piketHariIni} tickets={rawTickets} ringkas />
              </div>
            </>
          }
        />
      }
      panelSamping={<PanelSamping piket={piketHariIni} tickets={rawTickets} />}
    >
      {children}
    </GuruShell>
  );
}
