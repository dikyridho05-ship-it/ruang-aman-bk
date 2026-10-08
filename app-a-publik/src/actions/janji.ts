"use server";

import { aksesTiketGuru } from "@/lib/akses/tiket-guru";
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
  | { success: true; janji: JanjiTemu | null }
  | { success: false; error: string };

export type DataPilihan =
  | { success: true; pilihan: HariLayanan[] }
  | { success: false; error: string };

const SESI_SISWA_HABIS = "Sesi habis, silakan cek balasan ulang.";

// ============ SISWA ============
// Sama seperti chat: kode tiket SELALU dari sesi, tidak pernah dari klien.

export async function dataJanjiSiswaAction(): Promise<DataJanji> {
  const kode = await getAuthenticatedSiswaKode();
  if (!kode) return { success: false, error: SESI_SISWA_HABIS };
  return { success: true, janji: await janjiUntukTiket(kode) };
}

/** Slot kosong — diambil hanya saat pemilih waktu dibuka (bukan tiap polling). */
export async function pilihanSlotSiswaAction(): Promise<DataPilihan> {
  const kode = await getAuthenticatedSiswaKode();
  if (!kode) return { success: false, error: SESI_SISWA_HABIS };
  const janji = await janjiUntukTiket(kode);
  return { success: true, pilihan: await pilihanSlot(janji?.id) };
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
// Semua lewat aksesTiketGuru(): hanya Guru BK yang ditugaskan ke curhatan ini.

export async function dataJanjiGuruAction(kode: string): Promise<DataJanji> {
  const akses = await aksesTiketGuru(kode);
  if (!akses.ok) return { success: false, error: akses.error };
  const { guru } = akses;
  return { success: true, janji: await janjiUntukTiket(kode) };
}

export async function pilihanSlotGuruAction(kode: string): Promise<DataPilihan> {
  const akses = await aksesTiketGuru(kode);
  if (!akses.ok) return { success: false, error: akses.error };
  const { guru } = akses;
  const janji = await janjiUntukTiket(kode);
  return { success: true, pilihan: await pilihanSlot(janji?.id) };
}

export async function konfirmasiJanjiGuruAction(kode: string): Promise<HasilJanji> {
  const akses = await aksesTiketGuru(kode);
  if (!akses.ok) return { success: false, error: akses.error };
  const { guru } = akses;
  return setujuiWaktu(kode, "guru", { uid: guru.uid, nama: guru.nama });
}

export async function usulkanJanjiGuruAction(
  kode: string,
  waktuMulaiMs: number,
  catatan?: string
): Promise<HasilJanji> {
  const akses = await aksesTiketGuru(kode);
  if (!akses.ok) return { success: false, error: akses.error };
  const { guru } = akses;
  return usulkanWaktu(kode, "guru", waktuMulaiMs, catatan, { uid: guru.uid, nama: guru.nama });
}

export async function batalkanJanjiGuruAction(kode: string, alasan?: string): Promise<HasilJanji> {
  const akses = await aksesTiketGuru(kode);
  if (!akses.ok) return { success: false, error: akses.error };
  const { guru } = akses;
  return batalkanJanji(kode, "guru", alasan);
}

export async function catatHasilJanjiGuruAction(kode: string, hadir: boolean): Promise<HasilJanji> {
  const akses = await aksesTiketGuru(kode);
  if (!akses.ok) return { success: false, error: akses.error };
  const { guru } = akses;
  return catatHasilJanji(kode, hadir);
}
