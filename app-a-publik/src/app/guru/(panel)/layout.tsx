import { redirect } from "next/navigation";
import { getAuthenticatedGuru } from "@/lib/session/guru-session";
import { adminDb } from "@/lib/firebase/admin";
import { getPiketHariIni } from "@/lib/firestore/piket";
import { keTicketRow } from "@/lib/firestore/ticket-row";
import { janjiMenungguGuru, janjiMilikGuru, janjiPadaHari } from "@/lib/janji/server";
import { tanggalPanjang } from "@/lib/waktu";
import GuruShell from "@/components/guru/GuruShell";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import DaftarCurhatan from "@/components/guru/DaftarCurhatan";
import RingkasanHariIni, { RingkasanPadat } from "@/components/guru/RingkasanHariIni";
import type { TicketRow } from "@/types/ticket";

export const dynamic = "force-dynamic";

/**
 * Layout panel Guru BK — dipakai bersama oleh /guru (belum ada tiket
 * terpilih) dan /guru/{kode} (satu tiket terbuka).
 *
 * Daftar curhatan & ringkasan hari ini diambil DI SINI, bukan di
 * masing-masing halaman: layout tidak dirender ulang saat berpindah antar
 * halaman anaknya, jadi guru bisa meloncat dari satu curhatan ke curhatan
 * berikutnya tanpa daftar di kiri berkedip. Perubahan status tetap
 * tersusul karena aksi di halaman tiket memanggil router.refresh().
 *
 * /guru/login sengaja di luar route group "(panel)" supaya bisa diakses
 * tanpa sesi.
 */
export default async function GuruPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const guru = await getAuthenticatedGuru();
  if (!guru) redirect("/guru/login");

  const sekarang = Date.now();
  const [snap, piketHariIni, janjiHariIniSemua, janjiMenungguSemua] = await Promise.all([
    adminDb.collection("curhatan").orderBy("createdAt", "desc").limit(50).get(),
    getPiketHariIni(),
    janjiPadaHari(sekarang),
    janjiMenungguGuru(),
  ]);
  // Janji temu hanya dari curhatan yang ditugaskan ke guru ini.
  const [janjiHariIni, janjiMenunggu] = await Promise.all([
    janjiMilikGuru(janjiHariIniSemua, guru.uid),
    janjiMilikGuru(janjiMenungguSemua, guru.uid),
  ]);

  // Curhatan milik guru lain / belum ditugaskan ikut dikirim dalam bentuk
  // terkunci (tanpa judul) — lihat keTicketRow.
  const rawTickets: TicketRow[] = snap.docs.map((d) => keTicketRow(d.data(), guru.uid));

  // Kursor "Muat lebih banyak" mengikuti halaman MENTAH apa adanya —
  // penyaringan terjadi di sisi klien (lihat DaftarCurhatan).
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
              <RingkasanPadat
                piket={piketHariIni}
                tickets={rawTickets}
                janjiHariIni={janjiHariIni}
                janjiMenunggu={janjiMenunggu}
              />
              <div className="shrink-0 px-1 lg:hidden">
                <PushSubscribeButton />
              </div>
            </>
          }
        />
      }
      ringkasan={
        <RingkasanHariIni
          guruNama={guru.nama}
          tanggal={tanggalPanjang(sekarang)}
          piket={piketHariIni}
          tickets={rawTickets}
          janjiHariIni={janjiHariIni}
          janjiMenunggu={janjiMenunggu}
        />
      }
    >
      {children}
    </GuruShell>
  );
}
