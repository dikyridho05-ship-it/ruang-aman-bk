"use server";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { catatAudit } from "@/lib/audit/log";

/**
 * Super Admin membuka isi chat satu curhatan — SEKALI PER CURHATAN.
 *
 * Penanda `dibukaAdmin` ditulis di dalam transaksi SEBELUM pesan dibaca:
 * kalau dua Super Admin menekan tombol bersamaan, hanya satu yang lolos.
 * Pesan dikirim sebagai hasil aksi ini saja (bukan dirender di halaman),
 * jadi tidak tersimpan di cache halaman mana pun — begitu ruang baca
 * ditutup, dimuat ulang, atau ditinggalkan, isinya hilang dan tidak bisa
 * diambil lagi oleh siapa pun di App B.
 */

export interface PesanDibuka {
  id: string;
  pengirim: "siswa" | "guru";
  isi: string;
  gambar?: string;
  createdAtMs: number | null;
}

export type HasilBukaChat =
  | {
      success: true;
      judul: string;
      namaSamaran: string | null;
      pesan: PesanDibuka[];
    }
  | { success: false; error: string };

const KODE_VALID = /^[A-Z0-9-]{4,40}$/;

export async function bukaIsiChatSekaliAction(kodeInput: string, alasanInput: string): Promise<HasilBukaChat> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const kode = (kodeInput ?? "").trim().toUpperCase();
  if (!KODE_VALID.test(kode)) return { success: false, error: "Kode curhatan tidak valid." };

  const alasan = (alasanInput ?? "").trim().replace(/\s+/g, " ");
  if (alasan.length < 10) return { success: false, error: "Tulis alasan membuka isi chat (minimal 10 karakter)." };
  if (alasan.length > 300) return { success: false, error: "Alasan maksimal 300 karakter." };

  const ref = adminDb.collection("curhatan").doc(kode);

  let ditolak = null as string | null;
  let judul = "";
  let namaSamaran = null as string | null;
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      ditolak = "Curhatan tidak ditemukan.";
      return;
    }
    const data = snap.data() ?? {};
    if (data.dibukaAdmin) {
      ditolak = `Isi chat curhatan ini sudah pernah dibuka oleh ${data.dibukaAdmin.nama ?? "Super Admin"} dan tidak bisa dibuka lagi.`;
      return;
    }
    judul = typeof data.judul === "string" ? data.judul : "";
    namaSamaran = typeof data.namaSamaran === "string" && data.namaSamaran.trim() ? data.namaSamaran.trim() : null;
    tx.update(ref, {
      dibukaAdmin: { uid: admin.uid, nama: admin.nama, alasan, waktu: FieldValue.serverTimestamp() },
    });
  });
  if (ditolak) return { success: false, error: ditolak };

  await catatAudit(admin.nama, "Buka Isi Chat Curhatan", `${kode} — alasan: ${alasan}`);

  const snapPesan = await ref.collection("pesan").orderBy("createdAt", "asc").get();
  const pesan: PesanDibuka[] = snapPesan.docs.map((d) => {
    const m = d.data();
    return {
      id: d.id,
      pengirim: m.pengirim === "guru" ? "guru" : "siswa",
      isi: typeof m.isi === "string" ? m.isi : "",
      ...(typeof m.gambar === "string" ? { gambar: m.gambar } : {}),
      createdAtMs: m.createdAt?.toMillis ? (m.createdAt.toMillis() as number) : null,
    };
  });

  return { success: true, judul, namaSamaran, pesan };
}
