import { adaKategoriPrioritas, normalizeKategori, type TicketRow } from "@/types/ticket";
import { aksesGuru, bacaPenugasan } from "@/lib/akses/aturan-tiket";

/**
 * Satu-satunya pemetaan dokumen `curhatan` → TicketRow, dipakai layout panel
 * Guru BK dan endpoint /api/guru/tickets.
 *
 * Curhatan yang TIDAK ditugaskan ke `guruUid` dikirim dalam bentuk terkunci:
 * judul dikosongkan di SINI, di server — jadi tulisan siswa tidak pernah
 * sampai ke browser guru yang tidak berhak, bukan sekadar disembunyikan
 * lewat CSS. Yang tersisa hanya data yang juga dilihat Super Admin
 * (kode, kategori, mood, status, waktu masuk, nama guru penanganan).
 */
export function keTicketRow(data: FirebaseFirestore.DocumentData, guruUid: string): TicketRow {
  const kategori = normalizeKategori(data.kategori);
  const penugasan = bacaPenugasan(data.guruDitugaskan);
  const terkunci = !aksesGuru(penugasan, guruUid).boleh;
  const pesanSiswa = (data.pesanTerakhirSiswaMs as number | undefined) ?? 0;
  const bacaGuru = (data.bacaGuruMs as number | undefined) ?? 0;
  return {
    kode: data.kode,
    kategori,
    mood: data.mood,
    judul: terkunci ? "" : data.judul,
    status: data.status,
    createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
    prioritas: adaKategoriPrioritas(kategori) && data.status !== "selesai",
    guruDitugaskan: penugasan,
    terkunci,
    // Siswa mengirim pesan setelah Guru BK terakhir membuka percakapan.
    belumDibaca: !terkunci && data.status !== "selesai" && pesanSiswa > bacaGuru,
  };
}
