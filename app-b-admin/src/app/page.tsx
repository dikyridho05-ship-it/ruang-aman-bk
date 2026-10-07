import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { getSistemStatus } from "@/lib/status/sistem";
import { getJadwalPiketDenganNama } from "@/lib/firestore/piket";
import { getStatistikCurhatan } from "@/lib/firestore/statistik";
import { getJanjiRentang } from "@/lib/firestore/janji";
import { hitungPermintaanMenunggu } from "@/actions/akun-admin";
import { tengahMalamWib } from "@/lib/waktu";
import DasborView from "@/components/DasborView";

export const dynamic = "force-dynamic";

/**
 * Dasbor Super Admin. Disusun dari pertanyaan yang dibawa kepala sekolah
 * atau operator saat membukanya: "ada yang harus saya urus?" (paling atas),
 * "bagaimana layanan BK bulan ini?" (angka), lalu "siapa bertugas & ada
 * pertemuan apa?" (hari ini + kalender).
 */
export default async function AdminHomePage() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) redirect("/login");

  const sekarang = Date.now();
  // Rentang janji temu: sekitar sebulan ke belakang sampai dua bulan ke
  // depan — cukup untuk navigasi kalender di sekitar bulan ini.
  const [status, jadwalPiket, statistik, janji, permintaan] = await Promise.all([
    getSistemStatus(),
    getJadwalPiketDenganNama(),
    getStatistikCurhatan(),
    getJanjiRentang(tengahMalamWib(sekarang, -40), tengahMalamWib(sekarang, 70)),
    hitungPermintaanMenunggu(),
  ]);

  return <DasborView data={{ sekarang, status, jadwalPiket, statistik, janji, permintaan }} />;
}
