// API pagination tiket curhatan untuk halaman guru.
// Endpoint ini dilindungi oleh pengecekan sesi guru.
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthenticatedGuru } from '@/lib/session/guru-session';
import { Timestamp } from 'firebase-admin/firestore';
import { adaKategoriPrioritas, normalizeKategori } from '@/types/ticket';

export async function GET(request: Request) {
  // ─── Autentikasi: hanya guru yang sudah login yang boleh akses ───
  const guru = await getAuthenticatedGuru();
  if (!guru) {
    return NextResponse.json(
      { error: 'Tidak memiliki akses. Silakan login terlebih dahulu.' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const lastCreatedAt = searchParams.get('lastCreatedAt');
  const limit = 50;

  let query = adminDb
    .collection('curhatan')
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (lastCreatedAt) {
    // Kursor divalidasi dulu: parseInt("abc") menghasilkan NaN, dan
    // Timestamp.fromMillis(NaN) melempar error — satu request dengan
    // ?lastCreatedAt=abc cukup untuk membuat endpoint ini balas 500
    // ketimbang menolak dengan rapi. Angka negatif/tak berhingga juga
    // bukan kursor yang masuk akal untuk data yang selalu maju.
    const ms = Number(lastCreatedAt);
    if (!Number.isSafeInteger(ms) || ms <= 0) {
      return NextResponse.json(
        { error: 'Parameter lastCreatedAt tidak valid.' },
        { status: 400 },
      );
    }

    // Gunakan Firestore Timestamp, bukan JavaScript Date biasa,
    // supaya startAfter() berfungsi dengan benar.
    query = query.startAfter(Timestamp.fromMillis(ms));
  }

  const snap = await query.get();
  const tickets = snap.docs.map((doc) => {
    const data = doc.data();
    // `kategori` DIWAJIBKAN lewat normalizeKategori() (lihat types/ticket.ts)
    // — tiket lama sebelum revisi multi-kategori masih menyimpannya sebagai
    // string tunggal, dan `prioritas` sama sekali TIDAK DISIMPAN di
    // Firestore (dihitung, bukan field). Sebelumnya endpoint ini membaca
    // keduanya mentah-mentah: tiket lama bisa membuat UI guru crash
    // (labelKategori memanggil .map() pada string), dan setiap tiket di
    // luar 50 pertama selalu tampil non-prioritas — termasuk kategori
    // kekerasan/kesehatan mental, persis yang mestinya ditandai segera.
    const kategori = normalizeKategori(data.kategori);
    return {
      id: doc.id,
      kode: data.kode,
      kategori,
      mood: data.mood,
      judul: data.judul,
      status: data.status,
      createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
      prioritas: adaKategoriPrioritas(kategori) && data.status !== 'selesai',
      guruDitugaskan: data.guruDitugaskan ?? null,
    };
  });

  return NextResponse.json({ tickets });
}
