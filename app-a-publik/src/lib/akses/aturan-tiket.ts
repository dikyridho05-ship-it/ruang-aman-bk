/**
 * Aturan akses curhatan untuk Guru BK — logika MURNI (tanpa Firestore),
 * supaya bisa diuji langsung (scripts/uji-akses.ts).
 *
 * Aturannya (Okt 2026, diminta pemilik sekolah):
 * - Curhatan hanya bisa dibuka Guru BK yang DITUGASKAN Super Admin
 *   (`guruDitugaskan.uid`). Tidak ada pengecualian.
 * - Curhatan yang belum ditugaskan, atau ditugaskan ke Guru BK lain, tampil
 *   terkunci: kode, kategori, mood, status, dan waktu masuk saja. Judul
 *   (tulisan siswa) tidak pernah dikirim ke browser guru yang tidak berhak.
 * - Guru BK tidak bisa menugaskan atau memindahkan curhatan — hanya
 *   Super Admin lewat App B.
 */

export interface PenugasanTiket {
  uid: string;
  nama: string;
}

export type StatusAkses =
  | { boleh: true }
  | { boleh: false; alasan: "belum-ditugaskan" }
  | { boleh: false; alasan: "guru-lain"; namaGuru: string };

/** Baca `guruDitugaskan` mentah dari dokumen Firestore dengan aman. */
export function bacaPenugasan(raw: unknown): PenugasanTiket | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { uid?: unknown; nama?: unknown };
  if (typeof r.uid !== "string" || r.uid.length === 0) return null;
  return { uid: r.uid, nama: typeof r.nama === "string" && r.nama ? r.nama : "Guru BK" };
}

export function aksesGuru(penugasan: PenugasanTiket | null, guruUid: string): StatusAkses {
  if (!penugasan) return { boleh: false, alasan: "belum-ditugaskan" };
  if (penugasan.uid !== guruUid) return { boleh: false, alasan: "guru-lain", namaGuru: penugasan.nama };
  return { boleh: true };
}

/** Pesan yang ditampilkan ke Guru BK saat aksi ditolak. */
export function pesanTolak(akses: StatusAkses): string {
  if (akses.boleh) return "";
  return akses.alasan === "belum-ditugaskan"
    ? "Curhatan ini belum ditugaskan Super Admin kepada Guru BK mana pun."
    : `Curhatan ini ditangani ${akses.namaGuru}. Hanya Guru BK yang ditugaskan yang bisa membukanya.`;
}
