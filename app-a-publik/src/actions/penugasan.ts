"use server";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedGuru } from "@/lib/session/guru-session";

type MutateResult = { success: boolean; error?: string };
type GuruOption = { uid: string; nama: string };
type ListResult = { success: true; guru: GuruOption[] } | { success: false; error: string };

/**
 * Dipakai untuk isi dropdown "Ditugaskan ke" di /guru/[kode] — sengaja TIDAK
 * pakai `.orderBy("nama")` digabung `.where("aktif","==",true)` (itu butuh
 * composite index di Firestore, satu langkah manual lagi yang ingin
 * dihindari proyek ini); urut nama dilakukan di JS sesudah data diambil.
 */
export async function listGuruAktifAction(): Promise<ListResult> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const snap = await adminDb.collection("guru").where("aktif", "==", true).get();
  const daftar: GuruOption[] = snap.docs
    .map((d) => ({ uid: d.id, nama: (d.data().nama as string) ?? "(tanpa nama)" }))
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  return { success: true, guru: daftar };
}

/**
 * TAHAP 8 — siapa pun Guru BK aktif yang login boleh menugaskan/melepas
 * tugas tiket mana pun (belum ada peran "koordinator" terpisah di proyek
 * ini). `guruUid: null` berarti "lepas tugas" (kembali ke belum ditugaskan).
 */
export async function tugaskanTiketAction(
  kode: string,
  guruUid: string | null
): Promise<MutateResult> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const ticketRef = adminDb.collection("curhatan").doc(kode);

  if (guruUid === null) {
    await ticketRef.update({ guruDitugaskan: null, updatedAt: FieldValue.serverTimestamp() });
    return { success: true };
  }

  const targetSnap = await adminDb.collection("guru").doc(guruUid).get();
  if (!targetSnap.exists || targetSnap.data()?.aktif !== true) {
    return { success: false, error: "Guru BK tujuan tidak aktif atau tidak ditemukan." };
  }

  await ticketRef.update({
    guruDitugaskan: { uid: guruUid, nama: (targetSnap.data()?.nama as string) ?? "Guru BK" },
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
}
