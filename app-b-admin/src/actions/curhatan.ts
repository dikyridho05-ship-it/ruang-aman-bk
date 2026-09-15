"use server";

import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { catatAudit } from "@/lib/audit/log";
import { normalizeKategori, type KategoriCurhat, type Mood, type TicketStatus } from "@/types/statistik";

export interface CurhatanRow {
  kode: string;
  kategori: KategoriCurhat[];
  mood: Mood | null;
  status: TicketStatus | null;
  createdAtMs: number | null;
}

type ListResult = { success: true; curhatan: CurhatanRow[] } | { success: false; error: string };
type DeleteResult = { success: true; jumlah: number } | { success: false; error: string };

const BATAS_TAMPIL = 300;

/**
 * Sengaja hanya minta field kategori/mood/status/createdAt lewat `.select(...)`
 * — sama seperti getStatistikCurhatan() — supaya isi curhatan (judul,
 * namaSamaran, pesan) TIDAK PERNAH terbaca ke server App B. Super Admin di
 * sini cuma butuh cukup info untuk memilih tiket mana yang mau dihapus, bukan
 * membaca isinya (itu wilayah Guru BK di App A).
 */
export async function listCurhatanAction(): Promise<ListResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  try {
    const snap = await adminDb
      .collection("curhatan")
      .select("kategori", "mood", "status", "createdAt")
      .orderBy("createdAt", "desc")
      .limit(BATAS_TAMPIL)
      .get();

    const curhatan: CurhatanRow[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        kode: d.id,
        kategori: normalizeKategori(data.kategori),
        mood: (data.mood as Mood) ?? null,
        status: (data.status as TicketStatus) ?? null,
        createdAtMs: data.createdAt?.toMillis ? (data.createdAt.toMillis() as number) : null,
      };
    });

    return { success: true, curhatan };
  } catch (err) {
    console.error("[listCurhatanAction] gagal baca curhatan:", err);
    return { success: false, error: "Gagal memuat daftar curhatan." };
  }
}

/**
 * Hapus tiket-tiket terpilih. Satu `recursiveDelete` per kode (sama seperti
 * pola di lib/retensi/jalankan.ts) — ini yang menghapus dokumen tiket
 * sekaligus subcollection `pesan`-nya dalam satu panggilan, jadi tidak perlu
 * batch manual terpisah untuk pesan.
 */
export async function deleteCurhatanAction(kodeList: string[]): Promise<DeleteResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const kodeUnik = Array.from(new Set(kodeList)).filter(Boolean);
  if (kodeUnik.length === 0) return { success: false, error: "Tidak ada tiket yang dipilih." };

  for (const kode of kodeUnik) {
    await adminDb.recursiveDelete(adminDb.collection("curhatan").doc(kode));
  }

  await catatAudit(
    admin.nama,
    "Hapus Tiket Curhatan",
    kodeUnik.length === 1 ? kodeUnik[0] : `${kodeUnik.length} tiket: ${kodeUnik.join(", ")}`
  );

  return { success: true, jumlah: kodeUnik.length };
}

/** Hapus SEMUA tiket curhatan yang ada saat ini — dibatasi BATAS_TAMPIL sekali jalan sama seperti daftar yang ditampilkan. */
export async function deleteAllCurhatanAction(): Promise<DeleteResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  try {
    const snap = await adminDb.collection("curhatan").select().limit(BATAS_TAMPIL).get();
    const kodeList = snap.docs.map((d) => d.id);

    if (kodeList.length === 0) return { success: true, jumlah: 0 };

    for (const kode of kodeList) {
      await adminDb.recursiveDelete(adminDb.collection("curhatan").doc(kode));
    }

    await catatAudit(admin.nama, "Hapus Semua Tiket Curhatan", `${kodeList.length} tiket dihapus`);

    return { success: true, jumlah: kodeList.length };
  } catch (err) {
    console.error("[deleteAllCurhatanAction] gagal hapus semua curhatan:", err);
    return { success: false, error: "Gagal menghapus semua tiket." };
  }
}
