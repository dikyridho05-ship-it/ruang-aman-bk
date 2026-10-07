"use server";

import { getAuthenticatedGuru } from "@/lib/session/guru-session";
import { getAuthenticatedSiswaKode } from "@/lib/session/siswa-session";
import {
  batalkanJanji,
  catatHasilJanji,
  janjiUntukTiket,
  pilihanSlot,
  setujuiWaktu,
  usulkanWaktu,
  type HasilJanji,
} from "@/lib/janji/server";
import type { HariLayanan } from "@/lib/janji/aturan";
import type { JanjiTemu } from "@/types/janji";

export type DataJanji =
  | { success: true; janji: JanjiTemu | null; pilihan: HariLayanan[] }
  | { success: false; error: string };

const SESI_SISWA_HABIS = "Sesi habis, silakan cek balasan ulang.";
const SESI_GURU_HABIS = "Sesi login habis, silakan login ulang.";

// ============ SISWA ============
// Sama seperti chat: kode tiket SELALU dari sesi, tidak pernah dari klien.

export async function dataJanjiSiswaAction(): Promise<DataJanji> {
  const kode = await getAuthenticatedSiswaKode();
  if (!kode) return { success: false, error: SESI_SISWA_HABIS };
  const janji = await janjiUntukTiket(kode);
  return { success: true, janji, pilihan: await pilihanSlot(janji?.id) };
}

export async function ajukanJanjiSiswaAction(waktuMulaiMs: number, catatan?: string): Promise<HasilJanji> {
  const kode = await getAuthenticatedSiswaKode();
  if (!kode) return { success: false, error: SESI_SISWA_HABIS };
  return usulkanWaktu(kode, "siswa", waktuMulaiMs, catatan, null);
}

export async function terimaJanjiSiswaAction(): Promise<HasilJanji> {
  const kode = await getAuthenticatedSiswaKode();
  if (!kode) return { success: false, error: SESI_SISWA_HABIS };
  return setujuiWaktu(kode, "siswa", null);
}

export async function batalkanJanjiSiswaAction(): Promise<HasilJanji> {
  const kode = await getAuthenticatedSiswaKode();
  if (!kode) return { success: false, error: SESI_SISWA_HABIS };
  return batalkanJanji(kode, "siswa");
}

// ============ GURU BK ============

export async function dataJanjiGuruAction(kode: string): Promise<DataJanji> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: SESI_GURU_HABIS };
  const janji = await janjiUntukTiket(kode);
  return { success: true, janji, pilihan: await pilihanSlot(janji?.id) };
}

export async function konfirmasiJanjiGuruAction(kode: string): Promise<HasilJanji> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: SESI_GURU_HABIS };
  return setujuiWaktu(kode, "guru", { uid: guru.uid, nama: guru.nama });
}

export async function usulkanJanjiGuruAction(
  kode: string,
  waktuMulaiMs: number,
  catatan?: string
): Promise<HasilJanji> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: SESI_GURU_HABIS };
  return usulkanWaktu(kode, "guru", waktuMulaiMs, catatan, { uid: guru.uid, nama: guru.nama });
}

export async function batalkanJanjiGuruAction(kode: string, alasan?: string): Promise<HasilJanji> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: SESI_GURU_HABIS };
  return batalkanJanji(kode, "guru", alasan);
}

export async function catatHasilJanjiGuruAction(kode: string, hadir: boolean): Promise<HasilJanji> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { success: false, error: SESI_GURU_HABIS };
  return catatHasilJanji(kode, hadir);
}
