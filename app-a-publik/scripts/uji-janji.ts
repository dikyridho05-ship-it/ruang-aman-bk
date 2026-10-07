/**
 * Uji aturan janji temu (lib/janji/aturan.ts) — murni, tanpa Firestore.
 * Jalankan: npx tsx scripts/uji-janji.ts
 *
 * Yang paling penting diuji: perhitungan memakai WIB, bukan zona mesin.
 * Server Vercel berjalan di UTC; kalau hitungannya ikut zona mesin, Senin
 * pukul 06.00 WIB (= Minggu 23.00 UTC) dianggap masih hari Minggu.
 */
import {
  JAM_MULAI_MENIT,
  bagianWib,
  daftarHariLayanan,
  hariWib,
  kunciTanggalWib,
  labelWaktuJanji,
  msDariWib,
  slotSah,
  type HariKey,
} from "../src/lib/janji/aturan";

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

const tanpaLibur = new Set<string>();

console.log("Zona waktu");
// Senin 12 Okt 2026 06.00 WIB = Minggu 11 Okt 23.00 UTC
const seninPagi = msDariWib(2026, 10, 12, 6 * 60);
cek("Senin 06.00 WIB terbaca Senin walau di UTC masih Minggu", hariWib(seninPagi) === "senin");
cek("kunci tanggal WIB benar", kunciTanggalWib(seninPagi) === "2026-10-12");
cek("bagianWib menit benar", bagianWib(seninPagi).menit === 360);

console.log("Daftar hari");
const hari = daftarHariLayanan(seninPagi, null, tanpaLibur, 10);
cek("menghasilkan 10 hari", hari.length === 10, String(hari.length));
cek("tidak ada Sabtu/Minggu", hari.every((h) => !/^(Sabtu|Minggu)/.test(h.label)));
cek("hari pertama = Senin itu sendiri", hari[0].kunci === "2026-10-12");
cek(
  "slot pertama hari ini >= 2 jam dari sekarang (08.00 → mulai 08.00)",
  hari[0].slot[0] === msDariWib(2026, 10, 12, 8 * 60),
  labelWaktuJanji(hari[0].slot[0]),
);
cek("hari biasa punya 16 slot (07.30–15.00)", hari[1].slot.length === 16, String(hari[1].slot.length));
cek("slot pertama hari biasa 07.30", hari[1].slot[0] === msDariWib(2026, 10, 13, JAM_MULAI_MENIT));
cek(
  "slot terakhir 15.00 (selesai 15.30)",
  hari[1].slot.at(-1) === msDariWib(2026, 10, 13, 15 * 60),
);

console.log("Piket & libur");
const piketSelasaKamis = new Set<HariKey>(["selasa", "kamis"]);
const hariPiket = daftarHariLayanan(seninPagi, piketSelasaKamis, tanpaLibur, 4);
cek(
  "hanya hari yang ada piket",
  hariPiket.every((h) => /^(Selasa|Kamis)/.test(h.label)),
  hariPiket.map((h) => h.label).join(" | "),
);
const libur = new Set(["2026-10-13"]);
cek(
  "tanggal libur dilewati",
  !daftarHariLayanan(seninPagi, null, libur, 5).some((h) => h.kunci === "2026-10-13"),
);
cek(
  "data libur nasional bawaan dipakai (25 Des 2026 dilewati)",
  !daftarHariLayanan(msDariWib(2026, 12, 21, 6 * 60), null).some((h) => h.kunci === "2026-12-25"),
);

console.log("Validasi slot");
const slotBesok = msDariWib(2026, 10, 13, 9 * 60);
cek("slot sah diterima", slotSah(slotBesok, seninPagi, null, tanpaLibur));
cek("jam tidak bulat ditolak", !slotSah(slotBesok + 60_000, seninPagi, null, tanpaLibur));
cek("slot di masa lalu ditolak", !slotSah(msDariWib(2026, 10, 12, 7 * 60 + 30), seninPagi, null, tanpaLibur));
cek(
  "slot di luar jam layanan ditolak",
  !slotSah(msDariWib(2026, 10, 13, 16 * 60), seninPagi, null, tanpaLibur),
);
cek("slot hari Sabtu ditolak", !slotSah(msDariWib(2026, 10, 17, 9 * 60), seninPagi, null, tanpaLibur));

console.log("Label");
cek(
  "label waktu janji",
  labelWaktuJanji(slotBesok) === "Selasa, 13 Okt, 09.00–09.30",
  labelWaktuJanji(slotBesok),
);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
if (gagal > 0) process.exit(1);
