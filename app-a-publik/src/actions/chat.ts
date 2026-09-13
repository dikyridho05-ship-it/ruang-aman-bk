"use server";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedGuru } from "@/lib/session/guru-session";
import { getAuthenticatedSiswaKode } from "@/lib/session/siswa-session";
import { notifySiswaOnBalasan } from "@/lib/push/send-push";
import type { CurhatMessage, SerializedMessage } from "@/types/ticket";

type MessagesResult =
  | { success: true; messages: SerializedMessage[] }
  | { success: false; error: string };

type MutateResult = { success: boolean; error?: string };

function serialize(m: CurhatMessage): SerializedMessage {
  return {
    pengirim: m.pengirim,
    isi: m.isi,
    ...(m.gambar ? { gambar: m.gambar } : {}),
    createdAtMs: m.createdAt?.toMillis?.() ?? Date.now(),
  };
}

async function fetchMessages(kode: string): Promise<SerializedMessage[]> {
  const snap = await adminDb
    .collection("curhatan")
    .doc(kode)
    .collection("pesan")
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((d) => serialize(d.data() as CurhatMessage));
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

// ============ SISWA ============
// Tidak menerima parameter `kode` dari client sama sekali — kode diambil
// dari sesi yang sudah diverifikasi (getAuthenticatedSiswaKode), supaya
// siswa tidak bisa "mengaku-ngaku" mengakses tiket kode lain.

export async function getMessagesForSiswaAction(): Promise<MessagesResult> {
  const kode = await getAuthenticatedSiswaKode();
  if (!kode) return { success: false, error: "Sesi habis, silakan cek balasan ulang." };
  return { success: true, messages: await fetchMessages(kode) };
}

export async function sendSiswaMessageAction(
  isi: string,
  gambar?: string
): Promise<MutateResult> {
  const kode = await getAuthenticatedSiswaKode();
  if (!kode) return { success: false, error: "Sesi habis, silakan cek balasan ulang." };

  const validationError = validatePesan(isi, gambar);
  if (validationError) return { success: false, error: validationError };

  const ticketRef = adminDb.collection("curhatan").doc(kode);
  await ticketRef.collection("pesan").add({
    pengirim: "siswa",
    isi: isi.trim(),
    ...(gambar ? { gambar } : {}),
    createdAt: FieldValue.serverTimestamp(),
  });
  await ticketRef.update({ updatedAt: FieldValue.serverTimestamp() });

  return { success: true };
}

// ============ GURU BK ============
// `kode` diterima dari parameter (Guru boleh buka tiket mana saja), tapi
// setiap panggilan tetap wajib lolos getAuthenticatedGuru() dulu.

export async function getMessagesForGuruAction(kode: string): Promise<MessagesResult> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: "Sesi login habis, silakan login ulang." };
  return { success: true, messages: await fetchMessages(kode) };
}

export async function sendGuruReplyAction(
  kode: string,
  isi: string,
  gambar?: string
): Promise<MutateResult> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const validationError = validatePesan(isi, gambar);
  if (validationError) return { success: false, error: validationError };

  const ticketRef = adminDb.collection("curhatan").doc(kode);
  await ticketRef.collection("pesan").add({
    pengirim: "guru",
    isi: isi.trim(),
    ...(gambar ? { gambar } : {}),
    createdAt: FieldValue.serverTimestamp(),
  });
  await ticketRef.update({
    status: "dibalas",
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Sama seperti notifyGuruOnNewTicket di createCurhatTicket — kegagalan
  // kirim push TIDAK BOLEH membuat pengiriman balasan tampak gagal ke Guru
  // BK, balasannya sudah pasti tersimpan sebelum baris ini.
  notifySiswaOnBalasan(kode).catch((err) => {
    console.error("[sendGuruReplyAction] gagal kirim notifikasi push ke siswa:", err);
  });

  return { success: true };
}

export async function markTicketSelesaiAction(kode: string): Promise<MutateResult> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: "Sesi login habis, silakan login ulang." };

  await adminDb.collection("curhatan").doc(kode).update({
    status: "selesai",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
}
