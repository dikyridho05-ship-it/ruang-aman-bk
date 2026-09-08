import "server-only";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Menghasilkan Kode Konseling unik, format: BK-{tahun}-{4 digit berurutan}
 * Contoh: BK-2026-0187
 *
 * Nomor urut disimpan di counters/{tahun} dan di-increment lewat Firestore
 * transaction — ini yang menjamin dua siswa yang submit curhat DI DETIK YANG
 * SAMA tetap dapat kode berbeda (tidak ada race condition / kode bentrok),
 * tanpa perlu cek "apakah kode ini sudah dipakai" berulang-ulang.
 */
export async function generateKodeKonseling(): Promise<string> {
  const year = new Date().getFullYear();
  const counterRef = adminDb.collection("counters").doc(String(year));

  const nextNumber = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? ((snap.data()?.lastNumber as number) ?? 0) : 0;
    const next = current + 1;
    tx.set(counterRef, { lastNumber: next }, { merge: true });
    return next;
  });

  const padded = String(nextNumber).padStart(4, "0");
  return `BK-${year}-${padded}`;
}
