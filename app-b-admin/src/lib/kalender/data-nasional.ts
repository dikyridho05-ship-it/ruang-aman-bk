/**
 * Data statis (TAHAP 9 — redesain dashboard) hari libur nasional & kalender
 * akademik, dipakai kalender di dashboard utama Super Admin. Sengaja data
 * MENTAH di-hardcode (bukan API pihak ketiga — tidak ada API resmi libur
 * nasional Indonesia yang gratis & stabil), diverifikasi silang dari DUA
 * sumber independen sebelum ditulis di sini:
 *
 * - Hari libur nasional & cuti bersama 2026: SKB 3 Menteri (Menteri Agama
 *   No. 1497/2025, Menaker No. 2/2025, Menteri PANRB No. 5/2025) — dicek
 *   silang setneg.go.id vs blog.itera.ac.id, keduanya identik persis.
 * - Kalender pendidikan Provinsi Banten TA 2026/2027 — komunitasbelajar.id.
 *
 * PENTING: tanggal Hijriah (Idulfitri, Iduladha, dst.) bisa maju/mundur 1
 * hari dari keputusan resmi (sidang isbat) — daftar ini pakai tanggal SKB
 * yang berlaku saat proyek ini dibuat (September 2026). Perbarui manual
 * kalau ada revisi resmi, dan tambah tahun berikutnya di sini saat kalender
 * mendekati akhir tahun.
 */

export type JenisEventKalender = "libur_nasional" | "cuti_bersama" | "akademik";

export interface EventKalender {
  /** Format ISO yyyy-mm-dd. */
  tanggal: string;
  label: string;
  jenis: JenisEventKalender;
}

export const HARI_LIBUR_NASIONAL_2026: EventKalender[] = [
  { tanggal: "2026-01-01", label: "Tahun Baru Masehi", jenis: "libur_nasional" },
  { tanggal: "2026-01-16", label: "Isra Mikraj Nabi Muhammad SAW", jenis: "libur_nasional" },
  { tanggal: "2026-02-17", label: "Tahun Baru Imlek 2577", jenis: "libur_nasional" },
  { tanggal: "2026-03-19", label: "Hari Suci Nyepi (Tahun Baru Saka 1948)", jenis: "libur_nasional" },
  { tanggal: "2026-03-21", label: "Hari Raya Idulfitri 1447 H", jenis: "libur_nasional" },
  { tanggal: "2026-03-22", label: "Hari Raya Idulfitri 1447 H", jenis: "libur_nasional" },
  { tanggal: "2026-04-03", label: "Wafat Yesus Kristus", jenis: "libur_nasional" },
  { tanggal: "2026-04-05", label: "Kebangkitan Yesus Kristus (Paskah)", jenis: "libur_nasional" },
  { tanggal: "2026-05-01", label: "Hari Buruh Internasional", jenis: "libur_nasional" },
  { tanggal: "2026-05-14", label: "Kenaikan Yesus Kristus", jenis: "libur_nasional" },
  { tanggal: "2026-05-27", label: "Hari Raya Iduladha 1447 H", jenis: "libur_nasional" },
  { tanggal: "2026-05-31", label: "Hari Raya Waisak 2570 BE", jenis: "libur_nasional" },
  { tanggal: "2026-06-01", label: "Hari Lahir Pancasila", jenis: "libur_nasional" },
  { tanggal: "2026-06-16", label: "1 Muharram — Tahun Baru Islam 1448 H", jenis: "libur_nasional" },
  { tanggal: "2026-08-17", label: "Hari Kemerdekaan RI", jenis: "libur_nasional" },
  { tanggal: "2026-08-25", label: "Maulid Nabi Muhammad SAW", jenis: "libur_nasional" },
  { tanggal: "2026-12-25", label: "Hari Raya Natal", jenis: "libur_nasional" },
];

export const CUTI_BERSAMA_2026: EventKalender[] = [
  { tanggal: "2026-02-16", label: "Cuti bersama Tahun Baru Imlek", jenis: "cuti_bersama" },
  { tanggal: "2026-03-18", label: "Cuti bersama Hari Suci Nyepi", jenis: "cuti_bersama" },
  { tanggal: "2026-03-20", label: "Cuti bersama Idulfitri", jenis: "cuti_bersama" },
  { tanggal: "2026-03-23", label: "Cuti bersama Idulfitri", jenis: "cuti_bersama" },
  { tanggal: "2026-03-24", label: "Cuti bersama Idulfitri", jenis: "cuti_bersama" },
  { tanggal: "2026-05-15", label: "Cuti bersama Kenaikan Yesus Kristus", jenis: "cuti_bersama" },
  { tanggal: "2026-05-28", label: "Cuti bersama Iduladha", jenis: "cuti_bersama" },
  { tanggal: "2026-12-24", label: "Cuti bersama Hari Raya Natal", jenis: "cuti_bersama" },
];

/**
 * Agenda akademik Kalender Pendidikan Provinsi Banten TA 2026/2027 — cuma
 * milestone besar (bukan kalender harian lengkap), cukup untuk pengingat
 * "musim ujian mendekat" yang jadi alasan awal fitur jadwal piket diminta.
 */
export const AGENDA_AKADEMIK_BANTEN: EventKalender[] = [
  { tanggal: "2026-07-13", label: "Awal Semester Ganjil TA 2026/2027", jenis: "akademik" },
  { tanggal: "2026-11-30", label: "Awal Penilaian Sumatif Akhir Semester Ganjil", jenis: "akademik" },
  { tanggal: "2026-12-05", label: "Akhir Penilaian Sumatif Akhir Semester Ganjil", jenis: "akademik" },
  { tanggal: "2026-12-18", label: "Pembagian Rapor Semester Ganjil", jenis: "akademik" },
  { tanggal: "2026-12-19", label: "Awal Libur Semester Ganjil", jenis: "akademik" },
];

/** Gabungan semua event, terurut tanggal — dipakai kalender dashboard. */
export function getSemuaEventKalender(): EventKalender[] {
  return [...HARI_LIBUR_NASIONAL_2026, ...CUTI_BERSAMA_2026, ...AGENDA_AKADEMIK_BANTEN].sort(
    (a, b) => a.tanggal.localeCompare(b.tanggal)
  );
}
