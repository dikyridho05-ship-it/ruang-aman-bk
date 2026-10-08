import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { getWebPushClient } from "@/lib/push/webpush-client";

interface Langganan {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Kabari satu Guru BK lewat push (perangkat yang sudah ia aktifkan di App A)
 * bahwa ada curhatan yang ditugaskan kepadanya. Isi pesan sengaja tanpa
 * judul — App B memang tidak pernah membaca judul curhatan.
 *
 * Butuh tiga env yang sama dengan App A (NEXT_PUBLIC_VAPID_PUBLIC_KEY,
 * VAPID_PRIVATE_KEY, VAPID_SUBJECT). Kalau belum diisi di project Vercel
 * App B, fungsi ini diam saja: penugasan tetap tersimpan, guru melihatnya
 * di daftar "Tugas saya" saat membuka panel. Tidak pernah melempar error.
 */
export async function kabariGuruDitugaskan(guruUid: string, jumlah: number, urlTiket: string): Promise<void> {
  try {
    const webpush = getWebPushClient();
    if (!webpush) return;
    const ref = adminDb.collection("guru").doc(guruUid);
    const snap = await ref.get();
    const subs = (snap.data()?.pushSubscriptions ?? []) as Langganan[];
    if (subs.length === 0) return;

    const payload = JSON.stringify({
      title: jumlah > 1 ? `${jumlah} curhatan ditugaskan kepadamu` : "Curhatan baru ditugaskan kepadamu",
      body: "Buka Ruang Aman untuk membaca dan membalasnya.",
      url: urlTiket,
    });

    const masihBerlaku: Langganan[] = [];
    let berubah = false;
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload);
          masihBerlaku.push(sub);
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) berubah = true;
          else masihBerlaku.push(sub);
        }
      }),
    );
    if (berubah) await ref.update({ pushSubscriptions: masihBerlaku });
  } catch (err) {
    console.error("[kabariGuruDitugaskan]", err);
  }
}
