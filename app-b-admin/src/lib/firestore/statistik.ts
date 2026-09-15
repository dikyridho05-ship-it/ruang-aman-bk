import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import {
  KATEGORI_CURHAT,
  KATEGORI_PRIORITAS,
  MOOD_OPTIONS,
  normalizeKategori,
  type KategoriCurhat,
  type Mood,
  type TicketStatus,
  type StatistikCurhatan,
  type TrenBulanan,
} from "@/types/statistik";

const NAMA_BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const JUMLAH_BULAN_TREN = 6;
const HARI_JENDELA_TERKINI = 30;

const STATUS_LIST: readonly TicketStatus[] = ["baru", "dibaca", "dibalas", "selesai"];

function kunciBulan(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelBulan(d: Date): string {
  return `${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function bucketKosong<T extends string>(keys: readonly T[]): Record<T, number> {
  const bucket = {} as Record<T, number>;
  for (const k of keys) bucket[k] = 0;
  return bucket;
}

/**
 * Baca & agregasi SEMUA tiket curhatan jadi angka statistik anonim untuk
 * dashboard Kepala Sekolah (TAHAP 7) — dipakai juga oleh export Excel/PDF
 * supaya angkanya selalu konsisten dengan yang tampil di layar.
 *
 * Sengaja pakai `.select(...)` supaya field sensitif (judul, namaSamaran,
 * passwordHash, isi pesan di subcollection) TIDAK PERNAH ikut terbaca ke
 * memori server sama sekali — bukan cuma "tidak ditampilkan", tapi memang
 * tidak diminta dari Firestore. Cukup untuk skala satu sekolah (ratusan–
 * ribuan dokumen); kalau nanti jauh lebih besar, pertimbangkan agregat
 * precomputed lewat Cloud Function trigger, bukan scan penuh tiap load.
 */
export async function getStatistikCurhatan(): Promise<StatistikCurhatan> {
  const now = new Date();
  const perKategori = bucketKosong<KategoriCurhat>(KATEGORI_CURHAT);
  const perMood = bucketKosong<Mood>(MOOD_OPTIONS);
  const perStatus = bucketKosong<TicketStatus>(STATUS_LIST);

  const bulanBuckets: { bulan: string; label: string; jumlah: number }[] = [];
  for (let i = JUMLAH_BULAN_TREN - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    bulanBuckets.push({ bulan: kunciBulan(d), label: labelBulan(d), jumlah: 0 });
  }
  const bulanIndex = new Map(bulanBuckets.map((b, i) => [b.bulan, i]));

  const batasTerkini = new Date(now.getTime() - HARI_JENDELA_TERKINI * 24 * 60 * 60 * 1000);

  let totalKeseluruhan = 0;
  let total30HariTerakhir = 0;
  let prioritasAktif = 0;

  try {
    const snap = await adminDb
      .collection("curhatan")
      .select("kategori", "mood", "status", "createdAt")
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      // Satu tiket bisa membawa sampai 3 kategori, jadi tiap kategori dihitung
      // satu kali untuk tiket yang sama. Konsekuensinya: jumlah seluruh batang
      // di grafik "Per Kategori" bisa LEBIH BESAR dari total tiket — itu memang
      // benar, dan dijelaskan ke pembaca di StatistikView.
      const kategori = normalizeKategori(data.kategori);
      const mood = data.mood as Mood | undefined;
      const status = data.status as TicketStatus | undefined;
      const createdAt = data.createdAt?.toDate ? (data.createdAt.toDate() as Date) : null;

      totalKeseluruhan += 1;

      for (const k of kategori) perKategori[k] += 1;
      if (mood && mood in perMood) perMood[mood] += 1;
      if (status && status in perStatus) perStatus[status] += 1;

      // Tiket dihitung prioritas kalau SALAH SATU kategorinya berisiko tinggi —
      // dan tetap dihitung sekali saja walau dua-duanya dipilih.
      if (
        status !== "selesai" &&
        kategori.some((k) => (KATEGORI_PRIORITAS as readonly string[]).includes(k))
      ) {
        prioritasAktif += 1;
      }

      if (createdAt) {
        if (createdAt >= batasTerkini) total30HariTerakhir += 1;

        const idx = bulanIndex.get(kunciBulan(createdAt));
        if (idx !== undefined) bulanBuckets[idx].jumlah += 1;
      }
    }
  } catch (err) {
    // Konsisten dengan getSekolahSettings() — kalau Firestore tidak
    // terjangkau (mis. dites dari sandbox cloud), tampilkan dashboard
    // kosong dengan angka 0 daripada 500 error.
    console.error("[getStatistikCurhatan] gagal baca curhatan, pakai data kosong:", err);
  }

  const trenBulanan: TrenBulanan[] = bulanBuckets;

  return {
    totalKeseluruhan,
    total30HariTerakhir,
    prioritasAktif,
    perKategori,
    perMood,
    perStatus,
    trenBulanan,
    dibuatPada: now.getTime(),
  };
}
