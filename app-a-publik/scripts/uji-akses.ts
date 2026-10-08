/**
 * Uji aturan akses curhatan Guru BK (lib/akses/aturan-tiket.ts) dan
 * penyamaran judul di daftar (lib/firestore/ticket-row.ts) — tanpa Firestore.
 * Jalankan: npx tsx scripts/uji-akses.ts
 */
import { aksesGuru, bacaPenugasan, pesanTolak } from "../src/lib/akses/aturan-tiket";
import { keTicketRow } from "../src/lib/firestore/ticket-row";

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

const RATNA = { uid: "g-ratna", nama: "Bu Ratna" };

console.log("Aturan akses");
cek("belum ditugaskan → ditolak", aksesGuru(null, "g-ratna").boleh === false);
cek("ditugaskan ke dirinya → boleh", aksesGuru(RATNA, "g-ratna").boleh === true);
const lain = aksesGuru(RATNA, "g-hendra");
cek("ditugaskan ke guru lain → ditolak", lain.boleh === false);
cek(
  "pesan tolak menyebut nama guru penangan",
  pesanTolak(lain).includes("Bu Ratna"),
  pesanTolak(lain),
);
cek("pesan tolak belum ditugaskan", pesanTolak(aksesGuru(null, "x")).includes("belum ditugaskan"));

console.log("Membaca field guruDitugaskan dari Firestore");
cek("null → belum ditugaskan", bacaPenugasan(null) === null);
cek("field tidak ada (tiket lama) → belum ditugaskan", bacaPenugasan(undefined) === null);
cek("uid kosong → belum ditugaskan", bacaPenugasan({ uid: "", nama: "X" }) === null);
cek("bentuk aneh (string) → belum ditugaskan", bacaPenugasan("g-ratna") === null);
cek("nama hilang → 'Guru BK'", bacaPenugasan({ uid: "a" })?.nama === "Guru BK");

console.log("Daftar curhatan: judul disamarkan di server");
const dok = {
  kode: "BK-2026-AAAAAA",
  judul: "Rahasia siswa",
  kategori: ["kekerasan"],
  mood: "cemas",
  status: "baru",
  createdAt: { toMillis: () => 1_790_000_000_000 },
  guruDitugaskan: RATNA,
  pesanTerakhirSiswaMs: 10,
  bacaGuruMs: 0,
};
const milik = keTicketRow(dok, "g-ratna");
cek("pemilik melihat judul", milik.judul === "Rahasia siswa" && !milik.terkunci);
cek("pemilik melihat penanda pesan baru", milik.belumDibaca === true);
const orangLain = keTicketRow(dok, "g-hendra");
cek("guru lain: judul kosong", orangLain.judul === "" && orangLain.terkunci);
cek("guru lain: tidak ada penanda pesan baru", orangLain.belumDibaca === false);
cek("guru lain tetap melihat siapa penangannya", orangLain.guruDitugaskan?.nama === "Bu Ratna");
const belum = keTicketRow({ ...dok, guruDitugaskan: null }, "g-ratna");
cek("belum ditugaskan: terkunci untuk semua", belum.terkunci && belum.judul === "");
const lama = keTicketRow({ ...dok, guruDitugaskan: undefined }, "g-ratna");
cek("tiket lama tanpa field: terkunci", lama.terkunci && lama.judul === "");
cek(
  "JSON yang dikirim ke browser guru lain tidak memuat judul",
  !JSON.stringify(orangLain).includes("Rahasia"),
);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
if (gagal > 0) process.exit(1);
