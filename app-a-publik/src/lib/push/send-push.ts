import "server-only";
import type webpush from "web-push";
import { adminDb } from "@/lib/firebase/admin";
import { getWebPushClient } from "./webpush-client";
import {
  KATEGORI_CURHAT_LABEL,
  isKategoriPrioritas,
  type KategoriCurhat,
  type PushSubscriptionRecord,
} from "@/types/ticket";

interface NewTicketInfo {
  kode: string;
  kategori: KategoriCurhat;
  judul: string;
}

/**
 * Kirim satu payload ke sekumpulan subscription, buang yang sudah tidak
 * berlaku (404/410) dari hasilnya — dipakai bersama oleh notifikasi Guru BK
 * (TAHAP 6) & notifikasi balasan siswa (TAHAP 8) supaya penanganan
 * subscription kedaluwarsa konsisten di satu tempat saja.
 */
async function kirimKeSubscriptions(
  client: typeof webpush,
  subs: PushSubscriptionRecord[],
  payload: string
): Promise<{ stillValid: PushSubscriptionRecord[]; changed: boolean }> {
  const stillValid: PushSubscriptionRecord[] = [];
  let changed = false;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await client.sendNotification(sub, payload);
        stillValid.push(sub);
      } catch (err) {
        const statusCode = (err as { statusCode?: number } | undefined)?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Langganan sudah tidak berlaku (browser/OS mencabutnya) — buang.
          changed = true;
        } else {
          // Gangguan sesaat (jaringan, dll) — jangan buang langganannya.
          stillValid.push(sub);
          console.error("[kirimKeSubscriptions] gagal kirim ke satu subscription:", err);
        }
      }
    })
  );

  return { stillValid, changed };
}

/**
 * Dipanggil dari createCurhatTicket (actions/curhat.ts) SETELAH tiket
 * tersimpan. Kirim push notification ke semua perangkat Guru BK aktif yang
 * sudah berlangganan (lihat actions/push.ts untuk cara berlangganannya).
 *
 * Sengaja tidak pernah melempar error ke pemanggil — kegagalan di sini tidak
 * boleh membuat siswa merasa curhatannya gagal terkirim (curhatannya sudah
 * pasti tersimpan sebelum fungsi ini dipanggil).
 */
export async function notifyGuruOnNewTicket(ticket: NewTicketInfo): Promise<void> {
  const webpush = getWebPushClient();
  if (!webpush) {
    // Kunci VAPID belum diisi di .env.local — lewati diam-diam.
    return;
  }

  const prioritas = isKategoriPrioritas(ticket.kategori);
  const payload = JSON.stringify({
    title: prioritas ? "🔴 Curhatan Prioritas Baru" : "Curhatan Baru Masuk",
    body: `${KATEGORI_CURHAT_LABEL[ticket.kategori]} — ${ticket.judul}`,
    url: `/guru/${ticket.kode}`,
  });

  const guruSnap = await adminDb.collection("guru").where("aktif", "==", true).get();

  const cleanupWrites: Promise<unknown>[] = [];

  await Promise.all(
    guruSnap.docs.map(async (doc) => {
      const subs = (doc.data().pushSubscriptions ?? []) as PushSubscriptionRecord[];
      if (subs.length === 0) return;

      const { stillValid, changed } = await kirimKeSubscriptions(webpush, subs, payload);
      if (changed) {
        cleanupWrites.push(doc.ref.update({ pushSubscriptions: stillValid }));
      }
    })
  );

  await Promise.all(cleanupWrites);
}

/**
 * Dipanggil dari sendGuruReplyAction (actions/chat.ts) SETELAH balasan Guru
 * BK tersimpan — kirim push ke perangkat siswa yang sudah mengaktifkan
 * notifikasi UNTUK TIKET INI (lihat actions/push.ts). Sama seperti
 * notifyGuruOnNewTicket, sengaja tidak pernah melempar error ke pemanggil.
 */
export async function notifySiswaOnBalasan(kode: string): Promise<void> {
  const webpush = getWebPushClient();
  if (!webpush) return;

  const ref = adminDb.collection("curhatan").doc(kode);
  const snap = await ref.get();
  if (!snap.exists) return;

  const subs = (snap.data()?.siswaPushSubscriptions ?? []) as PushSubscriptionRecord[];
  if (subs.length === 0) return;

  const payload = JSON.stringify({
    title: "Ada Balasan Baru",
    body: "Guru BK sudah membalas curhatanmu.",
    url: "/cek-balasan",
  });

  const { stillValid, changed } = await kirimKeSubscriptions(webpush, subs, payload);
  if (changed) {
    await ref.update({ siswaPushSubscriptions: stillValid });
  }
}
