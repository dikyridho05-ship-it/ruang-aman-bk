/**
 * Kompres file gambar di BROWSER sebelum dikirim ke server (dipakai fitur
 * kirim gambar di chat, TAHAP 11) — hasilnya dikirim sebagai data URL base64
 * dan disimpan langsung sebagai field di dokumen pesan Firestore, BUKAN di
 * Firebase Storage. Ini keputusan sadar (sama seperti logo sekolah di App B)
 * supaya tidak perlu upgrade akun Firebase ke plan Blaze / kartu pembayaran.
 * Konsekuensinya: ukuran per gambar harus dijaga kecil, jadi selalu
 * di-resize + di-encode ulang sebagai JPEG lewat <canvas> di sini.
 *
 * Efek samping yang MENGUNTUNGKAN: menggambar ulang ke <canvas> otomatis
 * membuang metadata EXIF file asli (termasuk koordinat GPS kalau foto
 * diambil dari HP) karena canvas cuma menyalin piksel, bukan metadata —
 * relevan buat aplikasi anonim seperti ini.
 */

export const MAX_GAMBAR_DIMENSI = 1280; // px, sisi terpanjang setelah di-resize
export const TARGET_GAMBAR_BYTES = 500 * 1024; // ~500KB biner sebelum jadi base64
export const MAX_GAMBAR_FILE_ASLI_BYTES = 15 * 1024 * 1024; // 15MB — batas wajar file asli dari kamera HP

async function muatSumberGambar(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Lanjut ke fallback <img> di bawah (mis. format yang tidak didukung createImageBitmap)
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal membaca file gambar."));
    img.src = URL.createObjectURL(file);
  });
}

function ambilUkuran(src: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  return "width" in src && "height" in src
    ? { width: src.width, height: src.height }
    : { width: 0, height: 0 };
}

/**
 * Mengembalikan data URL ("data:image/jpeg;base64,...") siap dikirim ke
 * Server Action. Melempar Error dengan pesan Bahasa Indonesia yang aman
 * ditampilkan langsung ke pengguna kalau file bukan gambar / gagal diproses.
 */
export async function kompresGambarKeDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File yang dipilih bukan gambar.");
  }
  if (file.size > MAX_GAMBAR_FILE_ASLI_BYTES) {
    throw new Error("Ukuran file terlalu besar (maksimal 15MB).");
  }

  const sumber = await muatSumberGambar(file);
  const ukuran = ambilUkuran(sumber);
  if (!ukuran.width || !ukuran.height) {
    throw new Error("Gagal membaca dimensi gambar.");
  }

  const scale = Math.min(1, MAX_GAMBAR_DIMENSI / Math.max(ukuran.width, ukuran.height));
  const width = Math.max(1, Math.round(ukuran.width * scale));
  const height = Math.max(1, Math.round(ukuran.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar.");
  ctx.drawImage(sumber, 0, 0, width, height);

  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  // Panjang string base64 ~4/3 dari ukuran biner — turunkan kualitas
  // bertahap sampai di bawah target. Dibatasi jumlah percobaan supaya tidak
  // lama di HP yang lambat.
  let percobaan = 0;
  const targetPanjangBase64 = (TARGET_GAMBAR_BYTES * 4) / 3;
  while (dataUrl.length > targetPanjangBase64 && quality > 0.35 && percobaan < 6) {
    quality -= 0.12;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    percobaan += 1;
  }

  return dataUrl;
}
