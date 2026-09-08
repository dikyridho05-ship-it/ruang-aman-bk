"use server";

import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedGuru } from "@/lib/session/guru-session";
import { getAuthenticatedSiswaKode } from "@/lib/session/siswa-session";
import type { PushSubscriptionRecord } from "@/types/ticket";

type MutateResult = { success: boolean; error?: string };

function isValidSubscription(sub: unknown): sub is PushSubscriptionRecord {
  if (!sub || typeof sub !== "object") return false;
  const s = sub as Partial<PushSubscriptionRecord>;
  return (
    typeof s.endpoint === "string" &&
    s.endpoint.length > 0 &&
    typeof s.keys?.p256dh === "string" &&
    typeof s.keys?.auth === "string"
  );
}

/** Dipanggil dari PushSubscribeButton setelah browser berhasil subscribe. */
export async function savePushSubscriptionAction(subscription: unknown): Promise<MutateResult> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: "Sesi login habis, silakan login ulang." };

  if (!isValidSubscription(subscription)) {
    return { success: false, error: "Data langganan notifikasi tidak valid." };
  }

  const ref = adminDb.collection("guru").doc(guru.uid);
  const snap = await ref.get();
  const existing = (snap.data()?.pushSubscriptions ?? []) as PushSubscriptionRecord[];

  // Dedupe by endpoint — satu perangkat/browser cuma perlu satu entri aktif.
  const withoutDup = existing.filter((s) => s.endpoint !== subscription.endpoint);
  await ref.update({ pushSubscriptions: [...withoutDup, subscription] });

  return { success: true };
}

/** Dipanggil kalau Guru BK mematikan notifikasi dari browsernya sendiri. */
export async function removePushSubscriptionAction(endpoint: string): Promise<MutateResult> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const ref = adminDb.collection("guru").doc(guru.uid);
  const snap = await ref.get();
  const existing = (snap.data()?.pushSubscriptions ?? []) as PushSubscriptionRecord[];
  await ref.update({ pushSubscriptions: existing.filter((s) => s.endpoint !== endpoint) });

  return { success: true };
}

// ============ SISWA (TAHAP 8) ============
// Langgan per-TIKET, bukan per-akun (siswa memang sengaja tidak punya akun)
// — kode diambil dari sesi "cek balasan" yang sudah diverifikasi, sama
// seperti pola di actions/chat.ts, supaya siswa tidak bisa mendaftarkan
// notifikasi ke tiket kode lain.

/** Dipanggil dari SiswaPushSubscribeButton di halaman /cek-balasan. */
export async function saveSiswaPushSubscriptionAction(subscription: unknown): Promise<MutateResult> {
  const kode = await getAuthenticatedSiswaKode();
  if (!kode) return { success: false, error: "Sesi habis, silakan cek balasan ulang." };

  if (!isValidSubscription(subscription)) {
    return { success: false, error: "Data langganan notifikasi tidak valid." };
  }

  const ref = adminDb.collection("curhatan").doc(kode);
  const snap = await ref.get();
  const existing = (snap.data()?.siswaPushSubscriptions ?? []) as PushSubscriptionRecord[];

  const withoutDup = existing.filter((s) => s.endpoint !== subscription.endpoint);
  await ref.update({ siswaPushSubscriptions: [...withoutDup, subscription] });

  return { success: true };
}

export async function removeSiswaPushSubscriptionAction(endpoint: string): Promise<MutateResult> {
  const kode = await getAuthenticatedSiswaKode();
  if (!kode) return { success: false, error: "Sesi habis, silakan cek balasan ulang." };

  const ref = adminDb.collection("curhatan").doc(kode);
  const snap = await ref.get();
  const existing = (snap.data()?.siswaPushSubscriptions ?? []) as PushSubscriptionRecord[];
  await ref.update({ siswaPushSubscriptions: existing.filter((s) => s.endpoint !== endpoint) });

  return { success: true };
}
