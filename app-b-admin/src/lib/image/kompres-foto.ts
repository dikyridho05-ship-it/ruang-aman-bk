/**
 * Kompres foto di BROWSER sebelum dikirim ke Server Action — dipakai fitur
 * "Foto latar Beranda". Pola & alasannya sama persis dengan
 * app-a-publik/src/lib/image/kompres-gambar.ts: hasilnya disimpan sebagai
 * data URL base64 LANGSUNG di dokumen Firestore, bukan Firebase Storage,
 * supaya proyek ini tidak perlu upgrade ke plan Blaze.
 *
 * Bedanya dengan versi App A: dimensi maksimalnya lebih besar (foto ini
 * dipakai selebar layar, bukan sebagai gambar kecil di dalam balon chat),
 * tapi target ukurannya tetap ketat — dokumen Firestore dibatasi 1 MiB dan
 * base64 menambah ~33% dari ukuran biner.
 *
 * Efek samping yang menguntungkan: menggambar ulang lewat <canvas> membuang
 * metadata EXIF file asli (termasuk koordinat GPS kalau difoto pakai HP),
 * karena canvas hanya menyalin piksel.
 */

export const MAX_LATAR_DIMENSI = 1600; // px, sisi terpanjang setelah di-resize
export const TARGET_LATAR_BYTES = 400 * 1024; // ~400KB biner → ~533KB setelah base64
export const MAX_LATAR_FILE_ASLI_BYTES = 20 * 1024 * 1024; // 20MB — batas wajar file dari kamera HP

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

/** Mengembalikan data URL ("data:image/jpeg;base64,...") siap dikirim ke Server Action. */
export async function kompresFotoLatarKeDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File yang dipilih bukan gambar.");
  }
  if (file.size > MAX_LATAR_FILE_ASLI_BYTES) {
    throw new Error("Ukuran file terlalu besar (maksimal 20MB).");
  }

  const sumber = await muatSumberGambar(file);
  const lebarAsli = sumber.width;
  const tinggiAsli = sumber.height;
  if (!lebarAsli || !tinggiAsli) {
    throw new Error("Gagal membaca dimensi gambar.");
  }

  const skala = Math.min(1, MAX_LATAR_DIMENSI / Math.max(lebarAsli, tinggiAsli));
  const width = Math.max(1, Math.round(lebarAsli * skala));
  const height = Math.max(1, Math.round(tinggiAsli * skala));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar.");
  ctx.drawImage(sumber, 0, 0, width, height);

  let quality = 0.8;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  // Panjang string base64 ~4/3 dari ukuran biner — turunkan kualitas bertahap
  // sampai di bawah target. Foto ini nanti tampil dengan opasitas 25%, jadi
  // penurunan kualitas praktis tidak kelihatan.
  let percobaan = 0;
  const targetPanjangBase64 = (TARGET_LATAR_BYTES * 4) / 3;
  while (dataUrl.length > targetPanjangBase64 && quality > 0.3 && percobaan < 7) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    percobaan += 1;
  }

  return dataUrl;
}
