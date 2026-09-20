// API pagination tiket curhatan untuk halaman guru.
// Endpoint ini dilindungi oleh pengecekan sesi guru.
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthenticatedGuru } from '@/lib/session/guru-session';
import { Timestamp } from 'firebase-admin/firestore';

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
    // Gunakan Firestore Timestamp, bukan JavaScript Date biasa,
    // supaya startAfter() berfungsi dengan benar.
    const ts = Timestamp.fromMillis(parseInt(lastCreatedAt, 10));
    query = query.startAfter(ts);
  }

  const snap = await query.get();
  const tickets = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      kode: data.kode,
      kategori: data.kategori,
      mood: data.mood,
      judul: data.judul,
      status: data.status,
      createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
      prioritas: data.prioritas ?? false,
      guruDitugaskan: data.guruDitugaskan ?? null,
    };
  });

  return NextResponse.json({ tickets });
}
