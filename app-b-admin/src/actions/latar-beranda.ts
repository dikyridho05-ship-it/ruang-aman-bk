"use server";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { catatAudit } from "@/lib/audit/log";
import { MAKS_PANJANG_DATA_URL_LATAR } from "@/types/admin";

type LatarResult = { success: boolean; error?: string };

/**
 * Simpan / hapus foto latar Beranda App A.
 *
 * Sengaja disimpan di dokumen SENDIRI (`settings/latar-beranda`), bukan
 * digabung ke `settings/sekolah`. Alasannya: dokumen Firestore dibatasi 1 MiB,
 * dan `settings/sekolah` sudah menampung logo base64 + dibaca di banyak tempat
 * (Beranda, halaman Pengaturan, retensi). Kalau foto latar ikut di sana, setiap
 * pembacaan nama sekolah jadi ikut menyeret ratusan KB foto yang tidak dipakai.
 *
 * Fotonya sudah dikompres di browser (lihat lib/image/kompres-foto.ts) — di
 * sini tinggal divalidasi bentuk & ukurannya, karena Server Action tetap bisa
 * dipanggil dengan isi apa pun dan tidak boleh percaya pada client.
 */
export async function simpanLatarBerandaAction(fotoDataUrl: string): Promise<LatarResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(fotoDataUrl)) {
    return { success: false, error: "Format foto tidak dikenali. Pilih file JPEG, PNG, atau WebP." };
  }
  if (fotoDataUrl.length > MAKS_PANJANG_DATA_URL_LATAR) {
    return {
      success: false,
      error: "Foto terlalu besar setelah dikompres. Coba pilih foto lain yang lebih sederhana.",
    };
  }

  await adminDb.collection("settings").doc("latar-beranda").set({
    fotoBase64: fotoDataUrl,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await catatAudit(
    admin.nama,
    "Ubah Foto Latar Beranda",
    `Foto latar Beranda diperbarui (~${Math.round(fotoDataUrl.length / 1024)} KB)`
  );

  return { success: true };
}

export async function hapusLatarBerandaAction(): Promise<LatarResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  // Dokumennya dikosongkan, bukan dihapus — supaya App A cukup membaca satu
  // bentuk data yang sama (ada dokumen, fotoBase64 null) tanpa kasus khusus.
  await adminDb.collection("settings").doc("latar-beranda").set({
    fotoBase64: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await catatAudit(admin.nama, "Ubah Foto Latar Beranda", "Foto latar Beranda dihapus");

  return { success: true };
}
