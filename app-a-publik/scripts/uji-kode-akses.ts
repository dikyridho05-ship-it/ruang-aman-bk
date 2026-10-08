/**
 * Uji Kode Akses Sekolah (lib/akses/token-akses.ts) — tanpa Firestore.
 * Jalankan: npx tsx scripts/uji-kode-akses.ts
 */
import {
  buatToken,
  kodeCocok,
  normalisasiKode,
  periksaKodeBaru,
  sidikKode,
  tokenBerlaku,
} from "../src/lib/akses/token-akses";

let lulus = 0;
let gagal = 0;
function cek(nama: string, syarat: boolean) {
  if (syarat) lulus++;
  else gagal++;
  console.log(`  ${syarat ? "✓" : "✗"} ${nama}`);
}

const KUNCI = "kunci-uji";
const HARI = 24 * 60 * 60 * 1000;
const t0 = 1_790_000_000_000;

console.log("Kode");
cek("huruf kecil, spasi & tanda hubung diabaikan", normalisasiKode(" smkn1-ciruas 26 ") === "SMKN1CIRUAS26");
cek("kode masukan cocok walau beda penulisan", kodeCocok("smkn1-ciruas", "SMKN1CIRUAS"));
cek("kode salah ditolak", !kodeCocok("SMKN1CIRUA5", "SMKN1CIRUAS"));
cek("kode baru terlalu pendek ditolak", periksaKodeBaru("AB12") !== null);
cek("kode baru dengan simbol ditolak", periksaKodeBaru("SMKN1!CIRUAS") !== null);
cek("kode baru valid diterima", periksaKodeBaru("ciruas-2026") === null);

console.log("Token di perangkat");
const sidik = sidikKode("CIRUAS2026");
const token = buatToken(KUNCI, sidik, t0, 365 * HARI);
cek("token baru berlaku", tokenBerlaku(token, KUNCI, sidik, t0 + HARI));
cek("token tidak memuat kode", !token.includes("CIRUAS"));
cek("token kedaluwarsa ditolak", !tokenBerlaku(token, KUNCI, sidik, t0 + 366 * HARI));
cek("setelah kode diganti, token lama ditolak", !tokenBerlaku(token, KUNCI, sidikKode("BARU2027"), t0 + HARI));
cek("token dengan kunci lain ditolak", !tokenBerlaku(token, "kunci-lain", sidik, t0 + HARI));
const [exp, sig] = token.split(".");
cek("masa berlaku diubah tangan ditolak", !tokenBerlaku(`${Number(exp) + 10 * 365 * HARI}.${sig}`, KUNCI, sidik, t0 + HARI));
cek("token kosong / rusak ditolak", !tokenBerlaku("", KUNCI, sidik, t0) && !tokenBerlaku("abc", KUNCI, sidik, t0));

console.log(`\n${lulus} lulus, ${gagal} gagal`);
if (gagal > 0) process.exit(1);
