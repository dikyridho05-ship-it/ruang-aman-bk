"use server";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedGuru } from "@/lib/session/guru-session";

/**
 * Catatan internal Guru BK per tiket — `curhatan/{kode}/catatanGuru`.
 *
 * Batas kerahasiaan dijaga oleh BENTUK kode, bukan oleh aturan tampilan:
 * - Tidak ada satu pun fungsi siswa (actions/chat.ts, actions/janji.ts,
 *   cek-balasan) yang membaca subkoleksi ini.
 * - App B (Super Admin) juga tidak membacanya.
 * - Ikut terhapus bersama tiketnya (recursiveDelete di retensi & di App B).
 */
export interface CatatanGuru {
  id: string;
  isi: string;
  penulisUid: string;
  penulisNama: string;
  dibuatMs: number;
}

const MAKS_ISI = 1000;
const SESI_HABIS = "Sesi login habis, silakan login ulang.";

function ref(kode: string) {
  return adminDb.collection("curhatan").doc(kode).collection("catatanGuru");
}

export async function daftarCatatanAction(
  kode: string
): Promise<{ success: true; catatan: CatatanGuru[] } | { success: false; error: string }> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: SESI_HABIS };

  const snap = await ref(kode).orderBy("dibuat", "desc").limit(100).get();
  return {
    success: true,
    catatan: snap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        isi: (x.isi as string) ?? "",
        penulisUid: (x.penulisUid as string) ?? "",
        penulisNama: (x.penulisNama as string) ?? "Guru BK",
        dibuatMs: x.dibuat?.toMillis ? (x.dibuat.toMillis() as number) : Date.now(),
      };
    }),
  };
}

export async function tambahCatatanAction(
  kode: string,
  isi: string
): Promise<{ success: boolean; error?: string }> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: SESI_HABIS };

  const bersih = isi.trim();
  if (bersih.length === 0) return { success: false, error: "Catatan masih kosong." };
  if (bersih.length > MAKS_ISI) return { success: false, error: `Catatan maksimal ${MAKS_ISI} karakter.` };

  const tiket = await adminDb.collection("curhatan").doc(kode).get();
  if (!tiket.exists) return { success: false, error: "Curhatan ini sudah tidak ada." };

  await ref(kode).add({
    isi: bersih,
    penulisUid: guru.uid,
    penulisNama: guru.nama,
    dibuat: FieldValue.serverTimestamp(),
  });
  return { success: true };
}

/** Hanya penulisnya sendiri yang bisa menghapus catatannya. */
export async function hapusCatatanAction(
  kode: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: SESI_HABIS };

  const doc = await ref(kode).doc(id).get();
  if (!doc.exists) return { success: true };
  if (doc.data()?.penulisUid !== guru.uid) {
    return { success: false, error: "Catatan ini ditulis Guru BK lain dan hanya bisa dihapus olehnya." };
  }
  await doc.ref.delete();
  return { success: true };
}
