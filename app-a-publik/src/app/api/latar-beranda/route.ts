import "server-only";
import { NextResponse } from "next/server";
import { getLatarBeranda } from "@/lib/firestore/settings";

/**
 * Sebelumnya foto latar Beranda (bisa sampai ~533KB) disisipkan LANGSUNG
 * sebagai data URL base64 di dalam HTML halaman `/` — dan karena halaman itu
 * `force-dynamic`, seluruh HTML (foto ikut di dalamnya) dikirim ulang TANPA
 * cache di setiap kunjungan. Endpoint gambar terpisah ini memungkinkan
 * `Cache-Control` sendiri: browser cukup mengunduhnya sekali per beberapa
 * menit, bukan setiap kali membuka Beranda.
 */
export async function GET() {
  const { fotoBase64 } = await getLatarBeranda();
  if (!fotoBase64) {
    return new NextResponse(null, { status: 404 });
  }

  const cocok = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(fotoBase64);
  if (!cocok) {
    return new NextResponse(null, { status: 404 });
  }

  const [, contentType, base64Data] = cocok;
  const buffer = Buffer.from(base64Data, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      // 5 menit di browser & CDN, boleh sajikan versi basi sampai 1 hari
      // sambil revalidasi di belakang layar — cukup responsif kalau admin
      // ganti fotonya lewat App B, tanpa mengunduh ulang di SETIAP kunjungan.
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
