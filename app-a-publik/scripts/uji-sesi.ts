/**
 * Uji logika sesi siswa — bagian yang paling menentukan apakah keluhan
 * "kode konseling hilang" benar-benar tertambal.
 *
 * Tidak butuh Firestore maupun server: seluruh aturannya murni, dan memang
 * sengaja dipisah ke `sesi-util.ts` supaya bisa diuji seperti ini.
 */
import {
  DURASI_SESI_MS,
  MAKS_PERANGKAT,
  batasiJumlah,
  buangYangKedaluwarsa,
  hapusSesi,
  hashToken,
  sesiMasihBerlaku,
  tambahSesi,
} from "../src/lib/session/sesi-util";

let lulus = 0;
let gagal = 0;
function cek(nama: string, syarat: boolean, catatan = "") {
  if (syarat) {
    lulus++;
    console.log(`  ✓ ${nama}`);
  } else {
    gagal++;
    console.log(`  ✗ ${nama}${catatan ? ` — ${catatan}` : ""}`);
  }
}

const SEKARANG = 1_800_000_000_000;
const HARI = 24 * 60 * 60 * 1000;

console.log("\nUmur sesi:");
cek(
  `Sesi berlaku 30 hari, bukan 1 jam seperti versi lama (${Math.round(DURASI_SESI_MS / HARI)} hari)`,
  DURASI_SESI_MS === 30 * HARI
);

const sesiHp = tambahSesi({}, "token-hp", SEKARANG);
cek("Masuk dari satu perangkat membuat satu sesi", Object.keys(sesiHp).length === 1);
cek("Sesi baru berlaku sampai 30 hari ke depan",
  Object.values(sesiHp)[0] === SEKARANG + DURASI_SESI_MS);

console.log("\nBanyak perangkat sekaligus:");
const sesiHpLaptop = tambahSesi(sesiHp, "token-laptop", SEKARANG + 1000);
cek("Masuk dari HP kedua TIDAK mematikan sesi perangkat pertama",
  Object.keys(sesiHpLaptop).length === 2);
cek("Sesi perangkat pertama masih berlaku",
  sesiMasihBerlaku(sesiHpLaptop, "token-hp", SEKARANG + 2000));
cek("Sesi perangkat kedua juga berlaku",
  sesiMasihBerlaku(sesiHpLaptop, "token-laptop", SEKARANG + 2000));

let banyak = {};
for (let i = 0; i < MAKS_PERANGKAT + 3; i++) {
  banyak = tambahSesi(banyak, `token-${i}`, SEKARANG + i * 1000);
}
cek(`Perangkat dibatasi ${MAKS_PERANGKAT} terbaru supaya dokumen tidak membengkak`,
  Object.keys(banyak).length === MAKS_PERANGKAT, `dapat ${Object.keys(banyak).length}`);
cek("Yang tergeser adalah perangkat paling lama",
  !sesiMasihBerlaku(banyak, "token-0", SEKARANG) &&
    sesiMasihBerlaku(banyak, `token-${MAKS_PERANGKAT + 2}`, SEKARANG));

console.log("\nKedaluwarsa & keluar:");
const adaKedaluwarsa = {
  [hashToken("lama")]: SEKARANG - 1000,
  [hashToken("baru")]: SEKARANG + DURASI_SESI_MS,
};
const bersih = buangYangKedaluwarsa(adaKedaluwarsa, SEKARANG);
cek("Sesi kedaluwarsa dibuang saat peta ditulis ulang", Object.keys(bersih).length === 1);
cek("Sesi kedaluwarsa ditolak walau tokennya benar",
  !sesiMasihBerlaku(adaKedaluwarsa, "lama", SEKARANG));

const setelahKeluar = hapusSesi(sesiHpLaptop, "token-hp");
cek("Keluar mencabut sesi perangkat itu saja",
  !sesiMasihBerlaku(setelahKeluar, "token-hp", SEKARANG + 2000) &&
    sesiMasihBerlaku(setelahKeluar, "token-laptop", SEKARANG + 2000));

console.log("\nPenyimpanan token:");
cek("Token disimpan sebagai hash, bukan apa adanya",
  Object.keys(sesiHp)[0] !== "token-hp" && Object.keys(sesiHp)[0] === hashToken("token-hp"));
cek("Hash panjangnya 64 karakter heksadesimal (SHA-256)",
  /^[0-9a-f]{64}$/.test(hashToken("token-hp")));
cek("Token berbeda menghasilkan hash berbeda", hashToken("a") !== hashToken("b"));
cek("Peta kosong/rusak tidak membuat kode meledak",
  buangYangKedaluwarsa({}, SEKARANG) !== null &&
    batasiJumlah({}, 5) !== null &&
    !sesiMasihBerlaku(undefined, "apa pun", SEKARANG));

console.log(`\n${lulus} lulus, ${gagal} gagal\n`);
process.exit(gagal > 0 ? 1 : 0);
