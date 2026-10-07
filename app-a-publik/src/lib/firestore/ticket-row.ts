import { adaKategoriPrioritas, normalizeKategori, type TicketRow } from "@/types/ticket";

/**
 * Satu-satunya pemetaan dokumen `curhatan` → TicketRow, dipakai layout panel
 * Guru BK dan endpoint /api/guru/tickets. Sebelumnya dua tempat itu punya
 * salinan sendiri dan sempat berbeda (endpoint lupa menormalkan kategori).
 */
export function keTicketRow(data: FirebaseFirestore.DocumentData): TicketRow {
  const kategori = normalizeKategori(data.kategori);
  const pesanSiswa = (data.pesanTerakhirSiswaMs as number | undefined) ?? 0;
  const bacaGuru = (data.bacaGuruMs as number | undefined) ?? 0;
  return {
    kode: data.kode,
    kategori,
    mood: data.mood,
    judul: data.judul,
    status: data.status,
    createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
    prioritas: adaKategoriPrioritas(kategori) && data.status !== "selesai",
    guruDitugaskan: data.guruDitugaskan ?? null,
    // Siswa mengirim pesan setelah Guru BK terakhir membuka percakapan.
    belumDibaca: data.status !== "selesai" && pesanSiswa > bacaGuru,
  };
}
