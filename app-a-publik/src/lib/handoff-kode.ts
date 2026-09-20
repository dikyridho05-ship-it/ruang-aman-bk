"use client";

/**
 * Serah-terima Kode Konseling dari "Cek Balasan" ke "Lupa Password" TANPA
 * lewat query string URL. Sebelumnya link ini membawa `?kode=BK-2026-XXXXXX`
 * — rahasia utama tiket siswa jadinya mendarat di riwayat browser dan bisa
 * ikut terkirim lewat header Referer, sesuatu yang gampang bocor di
 * perangkat sekolah/pinjaman yang dipakai bergantian.
 *
 * `sessionStorage` dipakai sebagai gantinya: hanya hidup di tab ini, tidak
 * pernah dikirim ke jaringan, dan langsung dihapus begitu dibaca satu kali
 * (lihat `ambilKodeHandoff`) supaya tidak tertinggal lama di penyimpanan
 * browser.
 */
const KEY = "ra_handoff_kode";

export function simpanKodeHandoff(kode: string): void {
  try {
    sessionStorage.setItem(KEY, kode);
  } catch {
    // sessionStorage bisa gagal (mode privat ketat dsb) — tidak fatal,
    // halaman tujuan tetap punya form kosong untuk diisi manual.
  }
}

export function ambilKodeHandoff(): string | null {
  try {
    const nilai = sessionStorage.getItem(KEY);
    if (nilai) sessionStorage.removeItem(KEY);
    return nilai;
  } catch {
    return null;
  }
}
