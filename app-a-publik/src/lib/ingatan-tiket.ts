/**
 * Mengingat Kode Konseling DI PERANGKAT SISWA SENDIRI (localStorage).
 *
 * Ini penambal utama untuk keluhan "kodenya hilang": sebagian besar siswa
 * membuka aplikasi dari HP yang sama, jadi cukup browsernya yang mengingat.
 *
 * Yang disimpan HANYA kodenya — password tidak pernah ikut. Jadi kalau HP itu
 * dipinjam orang lain, yang paling jauh bisa dia lihat adalah bahwa ada kode
 * tersimpan, bukan isi curhatannya. Tetap disediakan tombol "lupakan" untuk
 * siswa yang memakai HP bersama atau HP pinjaman.
 *
 * Semua akses dibungkus try/catch: di mode penyamaran atau browser yang
 * memblokir penyimpanan situs, localStorage bisa melempar error — dan itu
 * tidak boleh membuat halamannya ikut rusak.
 */
const KUNCI = "ruang_aman_tiket";
const MAKS = 10;

export interface TiketDiingat {
  kode: string;
  disimpanPada: number;
}

export function ambilTiketDiingat(): TiketDiingat[] {
  if (typeof window === "undefined") return [];
  try {
    const mentah = window.localStorage.getItem(KUNCI);
    if (!mentah) return [];
    const data = JSON.parse(mentah);
    if (!Array.isArray(data)) return [];
    return data
      .filter((t): t is TiketDiingat => typeof t?.kode === "string")
      .sort((a, b) => (b.disimpanPada ?? 0) - (a.disimpanPada ?? 0));
  } catch {
    return [];
  }
}

export function ingatTiket(kode: string): void {
  if (typeof window === "undefined" || !kode) return;
  try {
    const lama = ambilTiketDiingat().filter((t) => t.kode !== kode);
    const baru = [{ kode, disimpanPada: Date.now() }, ...lama].slice(0, MAKS);
    window.localStorage.setItem(KUNCI, JSON.stringify(baru));
  } catch {
    // Tidak fatal — siswa tetap bisa mengetik kodenya manual.
  }
}

export function lupakanTiket(kode: string): void {
  if (typeof window === "undefined") return;
  try {
    const sisa = ambilTiketDiingat().filter((t) => t.kode !== kode);
    window.localStorage.setItem(KUNCI, JSON.stringify(sisa));
  } catch {
    // abaikan
  }
}

/**
 * Menggambar "kartu kode" ke canvas lalu mengunduhnya sebagai gambar, supaya
 * siswa bisa menyimpannya di galeri HP seperti menyimpan tiket atau struk —
 * cara paling alami buat anak menyimpan sesuatu di ponselnya.
 */
export function unduhKartuKode(kode: string, namaSekolah: string): void {
  try {
    const L = 720;
    const T = 420;
    const canvas = document.createElement("canvas");
    canvas.width = L;
    canvas.height = T;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, L, T);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "600 22px system-ui, -apple-system, sans-serif";
    ctx.fillText("KODE KONSELING", 48, 78);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "20px system-ui, -apple-system, sans-serif";
    ctx.fillText(namaSekolah, 48, 112);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 64px ui-monospace, Menlo, monospace";
    ctx.fillText(kode, 48, 216);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(48, 258);
    ctx.lineTo(L - 48, 258);
    ctx.stroke();

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "19px system-ui, -apple-system, sans-serif";
    ctx.fillText("Simpan gambar ini. Dipakai bersama password", 48, 300);
    ctx.fillText("yang kamu buat sendiri untuk cek balasan.", 48, 330);

    ctx.fillStyle = "#64748b";
    ctx.font = "17px system-ui, -apple-system, sans-serif";
    ctx.fillText(
      `Dibuat ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}`,
      48,
      376
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/png");
  } catch {
    // Kalau gagal, kode tetap terlihat jelas di layar untuk dicatat manual.
  }
}
