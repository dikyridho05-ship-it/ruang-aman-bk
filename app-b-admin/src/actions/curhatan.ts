"use server";

import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { FieldValue } from "firebase-admin/firestore";
import { catatAudit } from "@/lib/audit/log";
import { kabariGuruDitugaskan } from "@/lib/push/kirim-guru";
import { normalizeKategori, type KategoriCurhat, type Mood, type TicketStatus } from "@/types/statistik";

export interface CurhatanRow {
  kode: string;
  kategori: KategoriCurhat[];
  mood: Mood | null;
  status: TicketStatus | null;
  createdAtMs: number | null;
  /** Guru BK yang menangani; null = belum ditugaskan (terkunci untuk semua Guru BK). */
  guruDitugaskan: { uid: string; nama: string } | null;
  /** Isi chat sudah pernah dibuka Super Admin (sekali per curhatan). */
  dibukaAdmin: { nama: string; waktuMs: number | null } | null;
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
      .select("kategori", "mood", "status", "createdAt", "guruDitugaskan", "dibukaAdmin")
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
        guruDitugaskan:
          typeof data.guruDitugaskan?.uid === "string" && data.guruDitugaskan.uid
            ? { uid: data.guruDitugaskan.uid as string, nama: (data.guruDitugaskan.nama as string) || "Guru BK" }
            : null,
        dibukaAdmin: data.dibukaAdmin
          ? {
              nama: (data.dibukaAdmin.nama as string) || "Super Admin",
              waktuMs: data.dibukaAdmin.waktu?.toMillis ? (data.dibukaAdmin.waktu.toMillis() as number) : null,
            }
          : null,
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
    // Janji temu tiket ini disimpan di koleksi terpisah — ikut dihapus.
    await hapusJanjiTiket(adminDb, kode);
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
      // Janji temu tiket ini disimpan di koleksi terpisah — ikut dihapus.
      await hapusJanjiTiket(adminDb, kode);
    }

    await catatAudit(admin.nama, "Hapus Semua Tiket Curhatan", `${kodeList.length} tiket dihapus`);

    return { success: true, jumlah: kodeList.length };
  } catch (err) {
    console.error("[deleteAllCurhatanAction] gagal hapus semua curhatan:", err);
    return { success: false, error: "Gagal menghapus semua tiket." };
  }
}


/** Hapus dokumen `janjiTemu` milik satu tiket (koleksi tingkat atas, tidak ikut recursiveDelete). */
async function hapusJanjiTiket(db: FirebaseFirestore.Firestore, kode: string): Promise<void> {
  const snap = await db.collection("janjiTemu").where("kodeTiket", "==", kode).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}

type TugaskanResult = { success: true; jumlah: number } | { success: false; error: string };

const MAKS_TUGASKAN_SEKALIGUS = 100;

/**
 * Tugaskan (atau lepas) satu atau beberapa curhatan ke satu Guru BK.
 *
 * Sejak Okt 2026 ini SATU-SATUNYA jalan sebuah curhatan bisa dibuka Guru
 * BK: App A menolak semua akses ke curhatan yang `guruDitugaskan.uid`-nya
 * bukan guru yang sedang login. `guruUid: null` = lepas penugasan, curhatan
 * terkunci lagi untuk semua Guru BK.
 *
 * Nama guru diambil dari dokumen `guru/{uid}` di server (bukan dari browser),
 * dan hanya Guru BK AKTIF yang bisa ditugaskan.
 */
export async function tugaskanCurhatanAction(
  kodeList: string[],
  guruUid: string | null
): Promise<TugaskanResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const kodeUnik = Array.from(new Set(kodeList)).filter(
    (k) => typeof k === "string" && k.length > 0 && k.length <= 40 && !k.includes("/")
  );
  if (kodeUnik.length === 0) return { success: false, error: "Pilih minimal satu curhatan." };
  if (kodeUnik.length > MAKS_TUGASKAN_SEKALIGUS) {
    return { success: false, error: `Maksimal ${MAKS_TUGASKAN_SEKALIGUS} curhatan sekali tugaskan.` };
  }

  let penugasan: { uid: string; nama: string } | null = null;
  if (guruUid !== null) {
    const guruSnap = await adminDb.collection("guru").doc(guruUid).get();
    if (!guruSnap.exists || guruSnap.data()?.aktif !== true) {
      return { success: false, error: "Guru BK itu tidak aktif atau sudah dihapus." };
    }
    penugasan = { uid: guruUid, nama: (guruSnap.data()?.nama as string) || "Guru BK" };
  }

  const refs = kodeUnik.map((k) => adminDb.collection("curhatan").doc(k));
  const snaps = await adminDb.getAll(...refs, { fieldMask: ["guruDitugaskan"] });
  const ada = snaps.filter((s) => s.exists);
  if (ada.length === 0) return { success: false, error: "Curhatan tidak ditemukan." };

  const batch = adminDb.batch();
  for (const s of ada) {
    batch.update(s.ref, {
      guruDitugaskan: penugasan,
      ditugaskanOleh: penugasan ? admin.uid : null,
      ditugaskanPada: FieldValue.serverTimestamp(),
      // Tanda mengetik guru lama tidak boleh terbawa ke penanganan baru.
      ketikGuruSampaiMs: 0,
    });
  }
  await batch.commit();

  const daftarKode = ada.map((s) => s.id);
  await catatAudit(
    admin.nama,
    penugasan ? "Menugaskan curhatan" : "Melepas penugasan curhatan",
    `${daftarKode.length === 1 ? daftarKode[0] : `${daftarKode.length} curhatan (${daftarKode.join(", ")})`}${
      penugasan ? ` → ${penugasan.nama}` : ""
    }`
  );

  if (penugasan) {
    await kabariGuruDitugaskan(
      penugasan.uid,
      daftarKode.length,
      daftarKode.length === 1 ? `/guru/${daftarKode[0]}` : "/guru"
    );
  }

  return { success: true, jumlah: daftarKode.length };
}

/** Guru BK aktif untuk pilihan penugasan. */
export async function listGuruAktifUntukPenugasan(): Promise<{ uid: string; nama: string }[]> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return [];
  const snap = await adminDb.collection("guru").where("aktif", "==", true).get();
  return snap.docs
    .map((d) => ({ uid: d.id, nama: (d.data().nama as string) || "(tanpa nama)" }))
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}
