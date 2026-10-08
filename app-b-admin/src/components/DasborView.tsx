import Link from "next/link";
import DashboardCalendar from "@/components/DashboardCalendar";
import { getSemuaEventKalender } from "@/lib/kalender/data-nasional";
import { hariKeWib, jamWib, kunciTanggal, tanggalWaktu, tengahMalamWib } from "@/lib/waktu";
import type { HariPiket, SistemStatus } from "@/types/admin";
import type { JadwalPiketNama } from "@/lib/firestore/piket";
import type { StatistikCurhatan } from "@/types/statistik";
import type { JanjiKalender } from "@/lib/firestore/janji";

const HARI_BY_JS_DAY: HariPiket[] = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export interface DataDasbor {
  sekarang: number;
  status: SistemStatus;
  jadwalPiket: JadwalPiketNama;
  statistik: StatistikCurhatan;
  janji: JanjiKalender[];
  permintaan: number;
}

/** Tampilan dasbor Super Admin — data diambil di app/page.tsx. */
export default function DasborView({ data }: { data: DataDasbor }) {
  const { sekarang, status, jadwalPiket, statistik, janji, permintaan } = data;
  // Hari menurut WIB — server berjalan di UTC (lihat lib/waktu.ts).
  const hariIni = hariKeWib(sekarang);
  const todayIso = kunciTanggal(sekarang);
  const piketHariIni = jadwalPiket[HARI_BY_JS_DAY[hariIni]] ?? [];
  const hariSekolah = hariIni >= 1 && hariIni <= 5;
  const akhirMinggu = tengahMalamWib(sekarang, 7);
  const janjiMingguIni = janji.filter((j) => j.waktuMulaiMs >= tengahMalamWib(sekarang) && j.waktuMulaiMs < akhirMinggu);

  const totalStatus = Object.values(statistik.perStatus).reduce((a, b) => a + b, 0);
  const persenSelesai = totalStatus > 0 ? Math.round((statistik.perStatus.selesai / totalStatus) * 100) : null;
  const retensi = status.retensiTerakhir;

  const perhatian: { teks: string; href: string; tindakan: string; mendesak?: boolean }[] = [];
  if (statistik.belumDitugaskan > 0) {
    perhatian.push({
      teks:
        statistik.belumDitugaskanPrioritas > 0
          ? `${statistik.belumDitugaskan} curhatan belum ditugaskan, ${statistik.belumDitugaskanPrioritas} di antaranya prioritas (kekerasan atau kesehatan mental). Guru BK belum bisa membukanya.`
          : `${statistik.belumDitugaskan} curhatan belum ditugaskan ke Guru BK, jadi belum bisa dibuka siapa pun.`,
      href: "/curhatan",
      tindakan: "Tugaskan",
      mendesak: statistik.belumDitugaskanPrioritas > 0,
    });
  }
  if (retensi && !retensi.sukses) {
    perhatian.push({
      teks: `Pembersihan data otomatis terakhir gagal${retensi.pesanError ? `: ${retensi.pesanError}` : "."}`,
      href: "/pengaturan",
      tindakan: "Periksa pengaturan",
      mendesak: true,
    });
  }
  if (permintaan > 0) {
    perhatian.push({
      teks: `${permintaan} orang menunggu persetujuan akses Super Admin.`,
      href: "/akun-admin",
      tindakan: "Tinjau",
    });
  }
  if (hariSekolah && piketHariIni.length === 0) {
    perhatian.push({
      teks: `Belum ada Guru BK yang dijadwalkan piket hari ${NAMA_HARI[hariIni]}.`,
      href: "/piket",
      tindakan: "Atur piket",
    });
  }

  return (
    <div className="space-y-10">
      <section aria-labelledby="judul-perhatian">
        <h2 id="judul-perhatian" className="sr-only">
          Perlu ditindaklanjuti
        </h2>
        {perhatian.length === 0 ? (
          <p className="flex items-center gap-2 text-[15px] text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            Tidak ada yang perlu kamu tindak lanjuti saat ini.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            {perhatian.map((p) => (
              <li key={p.href} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${p.mendesak ? "bg-red-500" : "bg-langit-500"}`}
                  aria-hidden
                />
                <p className={`min-w-0 flex-1 text-[15px] ${p.mendesak ? "font-semibold text-red-800" : "text-slate-800"}`}>
                  {p.teks}
                </p>
                <Link
                  href={p.href}
                  className="rounded-lg bg-admin-800 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-admin-900"
                >
                  {p.tindakan}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="judul-angka">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="judul-angka" className="text-base font-bold text-admin-900">
            Layanan BK
          </h2>
          <Link href="/statistik" className="text-sm font-semibold text-admin-700 hover:underline">
            Lihat statistik lengkap
          </Link>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-200 lg:grid-cols-4">
          <Angka label="Curhatan 30 hari terakhir" nilai={statistik.total30HariTerakhir} />
          <Angka
            label="Prioritas yang masih terbuka"
            nilai={statistik.prioritasAktif}
            keterangan="kekerasan atau kesehatan mental"
            tegas={statistik.prioritasAktif > 0}
          />
          <Angka label="Sudah diselesaikan" nilai={persenSelesai === null ? "–" : `${persenSelesai}%`} keterangan={`dari ${totalStatus} curhatan`} />
          <Angka label="Janji temu 7 hari ke depan" nilai={janjiMingguIni.length} />
        </dl>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="judul-hari-ini">
            <h2 id="judul-hari-ini" className="text-base font-bold text-admin-900">
              Hari ini
            </h2>
            <div className="mt-3 rounded-xl bg-white ring-1 ring-slate-200">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-5 py-4">
                <p className="text-sm text-slate-500">Guru BK piket</p>
                <p className="text-[15px] font-semibold text-admin-900">
                  {piketHariIni.length > 0
                    ? piketHariIni.map((g) => g.nama).join(", ")
                    : hariSekolah
                      ? "Belum dijadwalkan"
                      : "Bukan hari sekolah"}
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-slate-500">Janji temu 7 hari ke depan</p>
                {janjiMingguIni.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">Belum ada janji temu.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {janjiMingguIni.slice(0, 8).map((j) => (
                      <li key={j.waktuMulaiMs} className="flex items-baseline gap-3 text-sm">
                        <span className="w-24 shrink-0 text-slate-500">
                          {NAMA_HARI[hariKeWib(j.waktuMulaiMs)]} {kunciTanggal(j.waktuMulaiMs).slice(8)}
                        </span>
                        <span className="w-12 shrink-0 font-semibold tabular-nums text-admin-900">{jamWib(j.waktuMulaiMs)}</span>
                        <span className="min-w-0 truncate text-slate-700">
                          {j.guruNama ?? "Guru BK belum ditentukan"}
                          {!j.dikonfirmasi && <span className="text-amber-700"> (belum dikonfirmasi)</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs text-slate-500">
                  Siapa siswanya tidak ditampilkan di sini — hanya Guru BK yang tahu.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="judul-sistem">
            <h2 id="judul-sistem" className="text-base font-bold text-admin-900">
              Sistem
            </h2>
            <dl className="mt-3 divide-y divide-slate-100 rounded-xl bg-white text-sm ring-1 ring-slate-200">
              <BarisSistem
                label="Pembersihan data otomatis"
                nilai={
                  retensi
                    ? `${retensi.sukses ? "Berhasil" : "Gagal"}, ${tanggalWaktu(retensi.waktuMs)}`
                    : "Belum pernah berjalan"
                }
                tegas={retensi ? !retensi.sukses : false}
              />
              {retensi && (
                <BarisSistem
                  label="Hasil terakhir"
                  nilai={`${retensi.tutupCount} ditutup, ${retensi.hapusCount} dihapus`}
                />
              )}
              <BarisSistem label="Curhatan tersimpan" nilai={String(status.totalTiket)} />
              <BarisSistem label="Catatan jejak aktivitas" nilai={String(status.totalAuditLog)} />
            </dl>
          </section>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <DashboardCalendar
            todayIso={todayIso}
            jadwalPiket={jadwalPiket}
            events={getSemuaEventKalender()}
            janji={janji.map((j) => ({
              tanggalIso: kunciTanggal(j.waktuMulaiMs),
              jam: jamWib(j.waktuMulaiMs),
              guruNama: j.guruNama,
              dikonfirmasi: j.dikonfirmasi,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

function Angka({
  label,
  nilai,
  keterangan,
  tegas = false,
}: {
  label: string;
  nilai: number | string;
  keterangan?: string;
  tegas?: boolean;
}) {
  return (
    <div className="bg-white px-5 py-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className={`mt-1 text-[30px] font-extrabold tabular-nums leading-none ${tegas ? "text-red-700" : "text-admin-900"}`}>
        {nilai}
      </dd>
      {keterangan && <dd className="mt-1.5 text-xs text-slate-500">{keterangan}</dd>}
    </div>
  );
}

function BarisSistem({ label, nilai, tegas = false }: { label: string; nilai: string; tegas?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={tegas ? "font-semibold text-red-700" : "font-medium text-slate-800"}>{nilai}</dd>
    </div>
  );
}
