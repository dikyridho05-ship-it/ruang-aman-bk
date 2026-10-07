"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedGuru } from "@/lib/session/guru-session";
import { getSesiSiswa } from "@/lib/session/siswa-session";
import { notifySiswaOnBalasan } from "@/lib/push/send-push";
import type { CurhatMessage, SerializedMessage } from "@/types/ticket";

/**
 * Hasil satu putaran polling chat.
 *
 * - `messages`: kalau `sejakMs` dikirim, HANYA pesan yang dibuat sejak itu
 *   (klien menggabungkan sendiri berdasarkan `id`). Versi sebelumnya
 *   mengunduh ulang SELURUH percakapan tiap 4 detik — termasuk gambar
 *   base64 — sehingga percakapan 30 pesan yang dibiarkan terbuka sejam
 *   memakan puluhan ribu baca Firestore (kuota gratis: 50.000/hari).
 * - `bacaLawanMs`: kapan pihak lawan terakhir membuka percakapan ini, untuk
 *   centang dua "dibaca".
 * - `lawanMengetik`: pihak lawan sedang mengetik saat ini.
 */
export type HasilChat =
  | {
      success: true;
      messages: SerializedMessage[];
      bacaLawanMs: number | null;
      lawanMengetik: boolean;
    }
  | { success: false; error: string };

type MutateResult = { success: boolean; error?: string };

type Peran = "siswa" | "guru";

const LAWAN: Record<Peran, Peran> = { siswa: "guru", guru: "siswa" };

/** Nama field per peran di dokumen tiket. */
const F = {
  baca: { siswa: "bacaSiswaMs", guru: "bacaGuruMs" },
  pesanTerakhir: { siswa: "pesanTerakhirSiswaMs", guru: "pesanTerakhirGuruMs" },
  ketikSampai: { siswa: "ketikSiswaSampaiMs", guru: "ketikGuruSampaiMs" },
} as const;

/** Lama tanda "sedang mengetik" bertahan setelah ketukan terakhir yang dilaporkan. */
const MASA_KETIK_MS = 6_000;

function serialize(id: string, m: CurhatMessage): SerializedMessage {
  return {
    id,
    pengirim: m.pengirim,
    isi: m.isi,
    ...(m.gambar ? { gambar: m.gambar } : {}),
    createdAtMs: m.createdAt?.toMillis?.() ?? Date.now(),
  };
}

async function fetchMessages(kode: string, sejakMs?: number): Promise<SerializedMessage[]> {
  let q = adminDb
    .collection("curhatan")
    .doc(kode)
    .collection("pesan")
    .orderBy("createdAt", "asc");
  // ">=" (bukan ">") karena Timestamp Firestore lebih presisi dari milidetik:
  // dua pesan bisa jatuh di milidetik yang sama. Duplikat disaring klien lewat `id`.
  if (typeof sejakMs === "number" && sejakMs > 0) {
    q = q.where("createdAt", ">=", Timestamp.fromMillis(sejakMs));
  }
  const snap = await q.get();
  return snap.docs.map((d) => serialize(d.id, d.data() as CurhatMessage));
}

/**
 * Inti polling untuk kedua peran. `data` adalah isi dokumen tiket yang SUDAH
 * terbaca saat verifikasi sesi, jadi di sini tidak ada baca dokumen tambahan.
 *
 * Penanda "sudah dibaca" hanya ditulis kalau memang ada pesan lawan yang
 * lebih baru dari penanda terakhir — bukan di setiap putaran polling —
 * supaya satu tab yang dibiarkan terbuka tidak menulis ke Firestore tiap
 * 4 detik.
 */
async function muatChat(
  kode: string,
  data: FirebaseFirestore.DocumentData,
  peran: Peran,
  sejakMs: number | undefined,
  terlihat: boolean
): Promise<HasilChat> {
  const lawan = LAWAN[peran];
  const messages = await fetchMessages(kode, sejakMs);

  const pesanLawanTerakhir = (data[F.pesanTerakhir[lawan]] as number | undefined) ?? 0;
  const bacaSaya = (data[F.baca[peran]] as number | undefined) ?? 0;
  if (terlihat && pesanLawanTerakhir > bacaSaya) {
    try {
      await adminDb
        .collection("curhatan")
        .doc(kode)
        .update({ [F.baca[peran]]: Date.now() });
    } catch (err) {
      console.error("[muatChat] gagal menandai dibaca:", err);
    }
  }

  const ketikSampai = (data[F.ketikSampai[lawan]] as number | undefined) ?? 0;
  return {
    success: true,
    messages,
    bacaLawanMs: (data[F.baca[lawan]] as number | undefined) ?? null,
    lawanMengetik: ketikSampai > Date.now(),
  };
}

// ~700.000 karakter base64 ≈ 525KB biner — kasih sedikit ruang di bawah
// target kompresi client (500KB) supaya pembulatan/variasi encoder tidak
// membuat pesan yang sudah lolos di browser malah ditolak di server.
const MAX_GAMBAR_BASE64_LENGTH = 700_000;
const GAMBAR_DATA_URL_PREFIX = /^data:image\/(png|jpe?g|webp);base64,/;

function validatePesan(isi: string, gambar?: string): string | null {
  const trimmed = isi.trim();
  if (trimmed.length === 0 && !gambar) return "Isi pesan atau lampirkan gambar.";
  if (trimmed.length > 2000) return "Pesan maksimal 2000 karakter.";
  if (gambar) {
    if (!GAMBAR_DATA_URL_PREFIX.test(gambar)) return "Format gambar tidak didukung.";
    if (gambar.length > MAX_GAMBAR_BASE64_LENGTH) return "Ukuran gambar terlalu besar.";
  }
  return null;
}

async function simpanPesan(kode: string, peran: Peran, isi: string, gambar?: string) {
  const ticketRef = adminDb.collection("curhatan").doc(kode);
  const sekarang = Date.now();
  await ticketRef.collection("pesan").add({
    pengirim: peran,
    isi: isi.trim(),
    ...(gambar ? { gambar } : {}),
    createdAt: FieldValue.serverTimestamp(),
  });
  return { ticketRef, sekarang };
}

const SESI_SISWA_HABIS = "Sesi habis, silakan cek balasan ulang.";
const SESI_GURU_HABIS = "Sesi login habis, silakan login ulang.";

// ============ SISWA ============
// Tidak menerima parameter `kode` dari client sama sekali — kode diambil
// dari sesi yang sudah diverifikasi, supaya siswa tidak bisa "mengaku-ngaku"
// mengakses tiket kode lain.

export async function getMessagesForSiswaAction(
  sejakMs?: number,
  terlihat = true
): Promise<HasilChat> {
  const sesi = await getSesiSiswa();
  if (!sesi) return { success: false, error: SESI_SISWA_HABIS };
  return muatChat(sesi.kode, sesi.data, "siswa", sejakMs, terlihat);
}

export async function sendSiswaMessageAction(
  isi: string,
  gambar?: string
): Promise<MutateResult> {
  const sesi = await getSesiSiswa();
  if (!sesi) return { success: false, error: SESI_SISWA_HABIS };

  const validationError = validatePesan(isi, gambar);
  if (validationError) return { success: false, error: validationError };

  const { ticketRef, sekarang } = await simpanPesan(sesi.kode, "siswa", isi, gambar);
  await ticketRef.update({
    updatedAt: FieldValue.serverTimestamp(),
    pesanTerakhirSiswaMs: sekarang,
    // Mengirim pesan = berhenti mengetik, dan jelas sudah membaca semuanya.
    ketikSiswaSampaiMs: 0,
    bacaSiswaMs: sekarang,
  });

  return { success: true };
}

/** Laporan "sedang mengetik" dari siswa — dipanggil klien paling sering sekali per 4 detik. */
export async function tandaiSiswaMengetikAction(): Promise<void> {
  const sesi = await getSesiSiswa();
  if (!sesi) return;
  try {
    await adminDb
      .collection("curhatan")
      .doc(sesi.kode)
      .update({ ketikSiswaSampaiMs: Date.now() + MASA_KETIK_MS });
  } catch {
    // Tanda mengetik cuma kosmetik — gagal tulis tidak perlu dilaporkan.
  }
}

// ============ GURU BK ============
// `kode` diterima dari parameter (Guru boleh buka tiket mana saja), tapi
// setiap panggilan tetap wajib lolos getAuthenticatedGuru() dulu.

export async function getMessagesForGuruAction(
  kode: string,
  sejakMs?: number,
  terlihat = true
): Promise<HasilChat> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: SESI_GURU_HABIS };

  const snap = await adminDb.collection("curhatan").doc(kode).get();
  if (!snap.exists) return { success: false, error: "Curhatan ini sudah tidak ada." };
  return muatChat(kode, snap.data() ?? {}, "guru", sejakMs, terlihat);
}

export async function sendGuruReplyAction(
  kode: string,
  isi: string,
  gambar?: string
): Promise<MutateResult> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: SESI_GURU_HABIS };

  const validationError = validatePesan(isi, gambar);
  if (validationError) return { success: false, error: validationError };

  const { ticketRef, sekarang } = await simpanPesan(kode, "guru", isi, gambar);
  await ticketRef.update({
    status: "dibalas",
    updatedAt: FieldValue.serverTimestamp(),
    pesanTerakhirGuruMs: sekarang,
    ketikGuruSampaiMs: 0,
    bacaGuruMs: sekarang,
  });

  // Kegagalan kirim push TIDAK BOLEH membuat pengiriman balasan tampak
  // gagal ke Guru BK — balasannya sudah pasti tersimpan sebelum baris ini.
  notifySiswaOnBalasan(kode).catch((err) => {
    console.error("[sendGuruReplyAction] gagal kirim notifikasi push ke siswa:", err);
  });

  return { success: true };
}

export async function tandaiGuruMengetikAction(kode: string): Promise<void> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return;
  try {
    await adminDb
      .collection("curhatan")
      .doc(kode)
      .update({ ketikGuruSampaiMs: Date.now() + MASA_KETIK_MS });
  } catch {
    // Tanda mengetik cuma kosmetik — gagal tulis tidak perlu dilaporkan.
  }
}

export async function markTicketSelesaiAction(kode: string): Promise<MutateResult> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: SESI_GURU_HABIS };

  await adminDb.collection("curhatan").doc(kode).update({
    status: "selesai",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
}
