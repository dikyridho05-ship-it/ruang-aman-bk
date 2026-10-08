import "server-only";
import webpush from "web-push";

let configured = false;

/**
 * Konfigurasi `web-push` cuma boleh dipanggil sekali per proses server.
 * Sengaja mengembalikan `null` (bukan melempar error) kalau env VAPID belum
 * diisi — supaya proyek ini tetap bisa jalan normal sebelum Kunci VAPID
 * ditambahkan ke .env.local, dan supaya kegagalan konfigurasi TIDAK PERNAH
 * mengganggu alur utama (pengiriman curhatan siswa harus selalu berhasil
 * terlepas dari status fitur notifikasi).
 */
export function getWebPushClient(): typeof webpush | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    return null;
  }

  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }

  return webpush;
}
