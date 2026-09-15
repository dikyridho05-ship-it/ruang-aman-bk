"use server";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { generateKodeKonseling } from "@/lib/firestore/kode-konseling";
import { hashPassword } from "@/lib/crypto/password";
import { createCurhatSchema } from "@/lib/validation/curhat";
import { isCurhatRateLimited, markCurhatSubmitted } from "@/lib/security/rate-limit";
import { notifyGuruOnNewTicket } from "@/lib/push/send-push";

export interface CreateCurhatResult {
  success: boolean;
  kode?: string;
  error?: string;
}

/**
 * Server Action untuk membuat tiket curhat baru.
 *
 * INI SATU-SATUNYA JALAN untuk menulis data curhat siswa ke Firestore.
 * Dipanggil langsung dari <form action={createCurhatTicket}> di TAHAP 3 nanti
 * (progressive enhancement — tetap jalan walau JS di HP siswa gagal load),
 * jadi terima FormData, bukan object biasa.
 *
 * Kenapa ini "aman" sesuai requirement:
 * - Jalan 100% di server, pakai Firebase Admin SDK (adminDb) — bukan client SDK.
 *   Siswa/browser TIDAK PERNAH punya akses tulis langsung ke Firestore, jadi
 *   firestore.rules bisa dikunci total (allow read, write: if false).
 * - Tidak menyentuh/menyimpan IP address atau request header apa pun.
 * - Password di-hash (bcrypt) sebelum disimpan — tidak pernah plaintext.
 * - Validasi lewat zod di server, jadi tidak bisa dilewati dari client.
 */
export async function createCurhatTicket(
  formData: FormData
): Promise<CreateCurhatResult> {
  // Honeypot: field ini disembunyikan lewat CSS di form asli (lihat
  // CurhatFlow.tsx) sehingga siswa sungguhan tidak pernah mengisinya — bot
  // formulir otomatis sering mengisi SEMUA field yang terlihat di DOM,
  // termasuk yang disembunyikan lewat CSS. Kalau field ini terisi, tolak
  // diam-diam (pesan generik, tidak membocorkan bahwa ini honeypot).
  if ((formData.get("website") as string | null)?.trim()) {
    return { success: false, error: "Data yang dikirim tidak valid." };
  }

  if (await isCurhatRateLimited()) {
    return {
      success: false,
      error: "Kamu baru saja mengirim curhatan. Tunggu sebentar sebelum kirim lagi.",
    };
  }

  const parsed = createCurhatSchema.safeParse({
    // getAll, bukan get — KategoriPicker mengirim satu <input name="kategori">
    // per kategori yang dipilih siswa (maks 3).
    kategori: formData.getAll("kategori"),
    mood: formData.get("mood"),
    judul: formData.get("judul"),
    namaSamaran: formData.get("namaSamaran"),
    isiCurhatan: formData.get("isiCurhatan"),
    password: formData.get("password"),
    siapBertemuGuruBk: formData.get("siapBertemuGuruBk") === "on",
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Data yang dikirim tidak valid.";
    return { success: false, error: firstError };
  }

  const { kategori, mood, judul, namaSamaran, isiCurhatan, password, siapBertemuGuruBk } =
    parsed.data;

  try {
    // 1. Kode Konseling unik (transaction-safe, lihat kode-konseling.ts)
    const kode = await generateKodeKonseling();

    // 2. Hash password siswa
    const passwordHash = await hashPassword(password);

    // 3. Simpan dokumen tiket + pesan pertama dalam satu batch write (atomik)
    const ticketRef = adminDb.collection("curhatan").doc(kode);
    const firstMessageRef = ticketRef.collection("pesan").doc();

    const batch = adminDb.batch();

    batch.set(ticketRef, {
      kode,
      kategori,
      mood,
      judul,
      namaSamaran,
      passwordHash,
      status: "baru",
      siapBertemuGuruBk,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    batch.set(firstMessageRef, {
      pengirim: "siswa",
      isi: isiCurhatan,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // Kedua langkah di bawah TIDAK BOLEH menggagalkan pengiriman curhatan
    // siswa walau salah satunya error — makanya dipanggil setelah tiket
    // sudah pasti tersimpan, dan notifikasi dibungkus try/catch sendiri.
    await markCurhatSubmitted();
    notifyGuruOnNewTicket({ kode, kategori, judul }).catch((err) => {
      console.error("[createCurhatTicket] gagal kirim notifikasi push:", err);
    });

    return { success: true, kode };
  } catch (err) {
    // Jangan bocorkan detail error internal ke client — cukup log di server.
    console.error("[createCurhatTicket] gagal menyimpan tiket:", err);
    return {
      success: false,
      error: "Terjadi kesalahan di server. Coba lagi beberapa saat lagi.",
    };
  }
}

/**
 * Wrapper tipis supaya cocok dipakai dengan React 19 `useActionState`
 * (TAHAP 3, komponen CurhatFlow) — hook itu memanggil action dengan
 * signature (prevState, formData), beda dari createCurhatTicket(formData)
 * di atas yang tetap kita jaga tetap reusable berdiri sendiri.
 */
export async function curhatFormAction(
  _prevState: CreateCurhatResult | null,
  formData: FormData
): Promise<CreateCurhatResult> {
  return createCurhatTicket(formData);
}
