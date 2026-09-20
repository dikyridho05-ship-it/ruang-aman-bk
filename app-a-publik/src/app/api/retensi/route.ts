import "server-only";
import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getSekolahSettings } from "@/lib/firestore/settings";
import { jalankanRetensi } from "@/lib/retensi/jalankan";

/** Bandingkan dua string tanpa membocorkan lewat waktu eksekusi di mana
 * perbedaannya terjadi (mis. serangan timing untuk menebak token rahasia
 * karakter demi karakter). `!==` biasa berhenti di ketidakcocokan pertama —
 * lebih cepat untuk yang lebih tidak cocok, celah yang tereksploitasi lewat
 * jaringan meski sempit. */
function bandingkanAman(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Endpoint untuk dipicu penjadwal EKSTERNAL (Vercel Cron, cron-job.org, atau
 * crontab kamu sendiri) setelah App A di-deploy ke domain publik — bukan
 * untuk dibuka manual dari browser. Dilindungi token rahasia lewat header
 * `Authorization: Bearer <RETENSI_CRON_SECRET>`, BUKAN sesi login Guru BK/
 * Admin (penjadwal eksternal tidak bisa login).
 *
 * Kalau `RETENSI_CRON_SECRET` belum diisi di .env.local, endpoint ini selalu
 * menolak (503) — konsisten dengan pola VAPID/webpush-client.ts: fitur yang
 * belum dikonfigurasi harus diam-diam tidak aktif, bukan berbahaya kalau lupa
 * diisi.
 *
 * Untuk dijalankan MANUAL oleh Super Admin (tanpa perlu deploy/cron), pakai
 * tombol "Jalankan Sekarang" di App B → Pengaturan — itu lewat Server Action
 * dengan Admin SDK App B sendiri, tidak lewat endpoint ini.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RETENSI_CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "RETENSI_CRON_SECRET belum diisi di .env.local." },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization");
  if (!auth || !bandingkanAman(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  const settings = await getSekolahSettings();
  const hasil = await jalankanRetensi(adminDb, settings.retensi);

  return NextResponse.json({ success: true, ...hasil });
}
