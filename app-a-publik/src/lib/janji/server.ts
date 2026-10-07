import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  DURASI_JANJI_MENIT,
  HARI_KEY,
  daftarHariLayanan,
  janjiMasihAktif,
  labelWaktuJanji,
  msDariWib,
  bagianWib,
  slotSah,
  type HariKey,
  type HariLayanan,
  type PihakJanji,
} from "@/lib/janji/aturan";
import { notifySemuaGuru, notifySiswa } from "@/lib/push/send-push";
import type { JanjiRingkas, JanjiTemu, JanjiTemuDoc } from "@/types/janji";

export const TEMPAT_BAWAAN = "Ruang BK";
const MAKS_CATATAN = 200;

export type HasilJanji = { success: true } | { success: false; error: string };

/**
 * Hari yang punya Guru BK piket (dari `settings/piket`). `null` kalau
 * jadwal piket belum diisi sama sekali — lihat daftarHariLayanan().
 */
async function hariAdaPiket(): Promise<Set<HariKey> | null> {
  try {
    const snap = await adminDb.collection("settings").doc("piket").get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    const hari = new Set<HariKey>();
    let adaIsi = false;
    for (const h of HARI_KEY) {
      const uids = (data[h] as string[] | undefined) ?? [];
      if (uids.length > 0) {
        adaIsi = true;
        hari.add(h);
      }
    }
    return adaIsi ? hari : null;
  } catch {
    return null;
  }
}

/** Slot yang sudah dipakai janji lain (menunggu/dikonfirmasi) dalam rentang hari pilihan. */
async function slotTerpakai(hari: HariLayanan[], kecualiId?: string): Promise<Set<number>> {
  if (hari.length === 0) return new Set();
  const dari = hari[0].slot[0];
  const sampai = hari[hari.length - 1].slot.at(-1)! + 1;
  const snap = await adminDb
    .collection("janjiTemu")
    .where("waktuMulaiMs", ">=", dari)
    .where("waktuMulaiMs", "<", sampai)
    .get();
  const terpakai = new Set<number>();
  for (const d of snap.docs) {
    if (d.id === kecualiId) continue;
    const j = d.data() as JanjiTemuDoc;
    if (janjiMasihAktif(j.status)) terpakai.add(j.waktuMulaiMs);
  }
  return terpakai;
}

/** Hari & slot yang masih bisa dipilih (slot terpakai sudah dibuang). */
export async function pilihanSlot(kecualiId?: string): Promise<HariLayanan[]> {
  const hari = daftarHariLayanan(Date.now(), await hariAdaPiket());
  const terpakai = await slotTerpakai(hari, kecualiId);
  return hari
    .map((h) => ({ ...h, slot: h.slot.filter((s) => !terpakai.has(s)) }))
    .filter((h) => h.slot.length > 0);
}

function keKlien(id: string, d: JanjiTemuDoc): JanjiTemu {
  return { id, ...d };
}

/** Janji yang sedang berjalan untuk satu tiket (atau yang terakhir, kalau sudah lewat). */
export async function janjiUntukTiket(kode: string): Promise<JanjiTemu | null> {
  const tiket = await adminDb.collection("curhatan").doc(kode).get();
  const id = tiket.data()?.janjiAktifId as string | undefined;
  if (!id) return null;
  const snap = await adminDb.collection("janjiTemu").doc(id).get();
  if (!snap.exists) return null;
  return keKlien(snap.id, snap.data() as JanjiTemuDoc);
}

function bersihkanCatatan(c: string | undefined): string {
  return (c ?? "").trim().slice(0, MAKS_CATATAN);
}

/**
 * Usulkan (atau usulkan ulang) waktu janji temu.
 *
 * - Belum ada janji aktif → dokumen baru.
 * - Sudah ada janji aktif → waktu di dokumen yang sama diganti, status
 *   kembali "menunggu" pihak lawan. Satu tiket hanya boleh punya SATU janji
 *   aktif, supaya Guru BK tidak dibanjiri usulan dari tiket yang sama.
 *
 * Bentrokan slot diperiksa di dalam transaksi: dua siswa yang memilih jam
 * yang sama di detik yang sama tidak akan sama-sama berhasil.
 */
export async function usulkanWaktu(
  kode: string,
  oleh: PihakJanji,
  waktuMulaiMs: number,
  catatan: string | undefined,
  guru: { uid: string; nama: string } | null
): Promise<HasilJanji> {
  if (!slotSah(waktuMulaiMs, Date.now(), await hariAdaPiket())) {
    return { success: false, error: "Waktu itu tidak tersedia. Pilih jam lain dari daftar." };
  }

  const tiketRef = adminDb.collection("curhatan").doc(kode);
  const sekarang = Date.now();
  let idJanji = "";

  try {
    await adminDb.runTransaction(async (tx) => {
      const tiket = await tx.get(tiketRef);
      if (!tiket.exists) throw new Error("TIKET_HILANG");
      if (tiket.data()?.status === "selesai") throw new Error("TIKET_SELESAI");

      const bentrok = await tx.get(
        adminDb.collection("janjiTemu").where("waktuMulaiMs", "==", waktuMulaiMs)
      );

      const aktifId = tiket.data()?.janjiAktifId as string | undefined;
      let janjiRef = aktifId ? adminDb.collection("janjiTemu").doc(aktifId) : null;
      if (janjiRef) {
        const lama = await tx.get(janjiRef);
        if (!lama.exists || !janjiMasihAktif((lama.data() as JanjiTemuDoc).status)) janjiRef = null;
      }

      const dipakaiOrangLain = bentrok.docs.some(
        (d) => d.id !== janjiRef?.id && janjiMasihAktif((d.data() as JanjiTemuDoc).status)
      );
      if (dipakaiOrangLain) throw new Error("BENTROK");

      const isi: Partial<JanjiTemuDoc> = {
        waktuMulaiMs,
        status: "menunggu",
        menungguPihak: oleh === "siswa" ? "guru" : "siswa",
        diusulkanOleh: oleh,
        catatan: bersihkanCatatan(catatan),
        diperbaruiMs: sekarang,
        ...(guru ? { guru } : {}),
      };

      if (janjiRef) {
        tx.update(janjiRef, isi);
        idJanji = janjiRef.id;
      } else {
        const baru = adminDb.collection("janjiTemu").doc();
        const doc: JanjiTemuDoc = {
          kodeTiket: kode,
          durasiMenit: DURASI_JANJI_MENIT,
          tempat: TEMPAT_BAWAAN,
          guru: guru ?? null,
          dibuatMs: sekarang,
          ...(isi as Omit<JanjiTemuDoc, "kodeTiket" | "durasiMenit" | "tempat" | "guru" | "dibuatMs">),
        };
        tx.set(baru, doc);
        idJanji = baru.id;
      }

      tx.update(tiketRef, {
        janjiAktifId: idJanji,
        // Meminta janji temu = bersedia bertemu langsung.
        ...(oleh === "siswa" ? { siapBertemuGuruBk: true } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "";
    if (pesan === "BENTROK")
      return { success: false, error: "Jam itu baru saja dipilih orang lain. Pilih jam lain." };
    if (pesan === "TIKET_SELESAI")
      return { success: false, error: "Curhatan ini sudah ditutup, janji temu tidak bisa dibuat." };
    if (pesan === "TIKET_HILANG") return { success: false, error: "Curhatan tidak ditemukan." };
    console.error("[usulkanWaktu]", err);
    return { success: false, error: "Gagal menyimpan janji temu. Coba lagi." };
  }

  const waktu = labelWaktuJanji(waktuMulaiMs);
  if (oleh === "siswa") {
    notifySemuaGuru({
      title: "Permintaan janji temu",
      body: `${kode} minta bertemu ${waktu}.`,
      url: `/guru/${kode}`,
    }).catch(() => {});
  } else {
    notifySiswa(kode, {
      title: "Guru BK mengusulkan waktu bertemu",
      body: `${waktu}. Buka Ruang Aman untuk menjawab.`,
      url: "/cek-balasan",
    }).catch(() => {});
  }
  return { success: true };
}

/** Pihak yang ditunggu menyetujui waktu yang diusulkan pihak lawan. */
export async function setujuiWaktu(
  kode: string,
  oleh: PihakJanji,
  guru: { uid: string; nama: string } | null
): Promise<HasilJanji> {
  const janji = await janjiUntukTiket(kode);
  if (!janji || janji.status !== "menunggu") {
    return { success: false, error: "Tidak ada janji temu yang menunggu jawaban." };
  }
  if (janji.menungguPihak !== oleh) {
    return { success: false, error: "Janji temu ini sedang menunggu jawaban pihak lain." };
  }
  await adminDb
    .collection("janjiTemu")
    .doc(janji.id)
    .update({
      status: "dikonfirmasi",
      menungguPihak: null,
      diperbaruiMs: Date.now(),
      ...(guru ? { guru } : {}),
    });

  const waktu = labelWaktuJanji(janji.waktuMulaiMs);
  if (oleh === "guru") {
    notifySiswa(kode, {
      title: "Janji temu dikonfirmasi",
      body: `${waktu} di ${janji.tempat}.`,
      url: "/cek-balasan",
    }).catch(() => {});
  } else {
    notifySemuaGuru({
      title: "Janji temu disetujui siswa",
      body: `${kode}: ${waktu}.`,
      url: `/guru/${kode}`,
    }).catch(() => {});
  }
  return { success: true };
}

export async function batalkanJanji(
  kode: string,
  oleh: PihakJanji,
  alasan?: string
): Promise<HasilJanji> {
  const janji = await janjiUntukTiket(kode);
  if (!janji || !janjiMasihAktif(janji.status)) {
    return { success: false, error: "Tidak ada janji temu yang bisa dibatalkan." };
  }
  await adminDb
    .collection("janjiTemu")
    .doc(janji.id)
    .update({
      status: "dibatalkan",
      menungguPihak: null,
      catatan: bersihkanCatatan(alasan) || janji.catatan,
      dibatalkanOleh: oleh,
      diperbaruiMs: Date.now(),
    });

  if (oleh === "guru") {
    notifySiswa(kode, {
      title: "Janji temu dibatalkan Guru BK",
      body: "Buka Ruang Aman untuk melihat alasannya atau memilih waktu lain.",
      url: "/cek-balasan",
    }).catch(() => {});
  } else {
    notifySemuaGuru({
      title: "Janji temu dibatalkan siswa",
      body: `${kode}: ${labelWaktuJanji(janji.waktuMulaiMs)}.`,
      url: `/guru/${kode}`,
    }).catch(() => {});
  }
  return { success: true };
}

/** Guru BK mencatat hasil pertemuan yang sudah lewat waktunya. */
export async function catatHasilJanji(kode: string, hadir: boolean): Promise<HasilJanji> {
  const janji = await janjiUntukTiket(kode);
  if (!janji || janji.status !== "dikonfirmasi") {
    return { success: false, error: "Hanya janji yang sudah dikonfirmasi yang bisa dicatat hasilnya." };
  }
  if (janji.waktuMulaiMs > Date.now()) {
    return { success: false, error: "Waktu janji temu ini belum tiba." };
  }
  await adminDb
    .collection("janjiTemu")
    .doc(janji.id)
    .update({ status: hadir ? "selesai" : "tidak-hadir", diperbaruiMs: Date.now() });
  return { success: true };
}

/** Janji temu aktif di hari tertentu (WIB) — untuk panel Guru BK. */
export async function janjiPadaHari(ms: number): Promise<JanjiRingkas[]> {
  const b = bagianWib(ms);
  const dari = msDariWib(b.tahun, b.bulan, b.tanggal, 0);
  const sampai = dari + 24 * 60 * 60 * 1000;
  try {
    const snap = await adminDb
      .collection("janjiTemu")
      .where("waktuMulaiMs", ">=", dari)
      .where("waktuMulaiMs", "<", sampai)
      .get();
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as JanjiTemuDoc) }))
      .filter((j) => janjiMasihAktif(j.status))
      .sort((a, b2) => a.waktuMulaiMs - b2.waktuMulaiMs)
      .map((j) => ({
        id: j.id,
        kodeTiket: j.kodeTiket,
        waktuMulaiMs: j.waktuMulaiMs,
        status: j.status,
        menungguPihak: j.menungguPihak,
        guruNama: j.guru?.nama ?? null,
      }));
  } catch (err) {
    console.error("[janjiPadaHari]", err);
    return [];
  }
}

/** Janji yang menunggu jawaban Guru BK, kapan pun waktunya — untuk antrean panel. */
export async function janjiMenungguGuru(): Promise<JanjiRingkas[]> {
  try {
    const snap = await adminDb
      .collection("janjiTemu")
      .where("menungguPihak", "==", "guru")
      .get();
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as JanjiTemuDoc) }))
      .filter((j) => j.status === "menunggu" && j.waktuMulaiMs > Date.now())
      .sort((a, b) => a.waktuMulaiMs - b.waktuMulaiMs)
      .map((j) => ({
        id: j.id,
        kodeTiket: j.kodeTiket,
        waktuMulaiMs: j.waktuMulaiMs,
        status: j.status,
        menungguPihak: j.menungguPihak,
        guruNama: j.guru?.nama ?? null,
      }));
  } catch (err) {
    console.error("[janjiMenungguGuru]", err);
    return [];
  }
}
