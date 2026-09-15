import {
  KATEGORI_CURHAT,
  KATEGORI_CURHAT_LABEL,
  MOOD_OPTIONS,
  MOOD_LABEL,
  MOOD_EMOJI,
  STATUS_LABEL,
  type TicketStatus,
} from "@/types/statistik";
import type { StatistikCurhatan } from "@/types/statistik";

const STATUS_ORDER: readonly TicketStatus[] = ["baru", "dibaca", "dibalas", "selesai"];

const STATUS_BADGE_CLASS: Record<TicketStatus, string> = {
  baru: "bg-blue-100 text-blue-700",
  dibaca: "bg-amber-100 text-amber-700",
  dibalas: "bg-violet-100 text-violet-700",
  selesai: "bg-emerald-100 text-emerald-700",
};

function persen(bagian: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((bagian / total) * 100);
}

function BarRow({
  label,
  jumlah,
  maksimum,
  aksen,
  emoji,
}: {
  label: string;
  jumlah: number;
  maksimum: number;
  aksen?: string;
  emoji?: string;
}) {
  const lebar = maksimum > 0 ? Math.max((jumlah / maksimum) * 100, jumlah > 0 ? 3 : 0) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-sm text-slate-600">
        {emoji ? `${emoji} ` : ""}
        {label}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${aksen ?? "bg-admin-500"}`}
          style={{ width: `${lebar}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-semibold text-slate-900">
        {jumlah}
      </span>
    </div>
  );
}

function StatCard({
  label,
  nilai,
  keterangan,
  aksen,
}: {
  label: string;
  nilai: string | number;
  keterangan: string;
  aksen?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${aksen ?? "text-slate-900"}`}>{nilai}</p>
      <p className="mt-0.5 text-xs text-slate-400">{keterangan}</p>
    </div>
  );
}

export default function StatistikView({ data }: { data: StatistikCurhatan }) {
  const { totalKeseluruhan, total30HariTerakhir, prioritasAktif, perKategori, perMood, perStatus, trenBulanan } =
    data;

  const maksKategori = Math.max(...KATEGORI_CURHAT.map((k) => perKategori[k]), 1);
  const maksMood = Math.max(...MOOD_OPTIONS.map((m) => perMood[m]), 1);
  const maksTren = Math.max(...trenBulanan.map((t) => t.jumlah), 1);
  const persenSelesai = persen(perStatus.selesai, totalKeseluruhan);

  if (totalKeseluruhan === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-3xl" aria-hidden>
          📭
        </p>
        <p className="mt-3 text-sm font-medium text-slate-700">Belum ada data curhatan.</p>
        <p className="mt-1 text-sm text-slate-500">
          Statistik akan muncul di sini begitu ada siswa yang mengirim curhatan lewat App A.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Curhatan" nilai={totalKeseluruhan} keterangan="Sepanjang waktu" />
        <StatCard
          label="30 Hari Terakhir"
          nilai={total30HariTerakhir}
          keterangan="Curhatan baru masuk"
        />
        <StatCard
          label="Prioritas Aktif"
          nilai={prioritasAktif}
          keterangan="Kekerasan/kes. mental, belum selesai"
          aksen={prioritasAktif > 0 ? "text-red-600" : undefined}
        />
        <StatCard label="Tingkat Selesai" nilai={`${persenSelesai}%`} keterangan="Tiket berstatus selesai" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Status Tiket</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => (
            <span
              key={s}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${STATUS_BADGE_CLASS[s]}`}
            >
              {STATUS_LABEL[s]} · {perStatus[s]}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Per Kategori</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Tanpa identitas siswa mana pun. Satu curhatan boleh memilih sampai 3
            kategori, jadi jumlah seluruh baris di sini bisa melebihi total curhatan.
          </p>
          <div className="mt-4 space-y-2.5">
            {KATEGORI_CURHAT.map((k) => (
              <BarRow
                key={k}
                label={KATEGORI_CURHAT_LABEL[k]}
                jumlah={perKategori[k]}
                maksimum={maksKategori}
                aksen={k === "kekerasan" || k === "kesehatan_mental" ? "bg-red-500" : undefined}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Per Mood</h2>
          <p className="mt-0.5 text-xs text-slate-400">Mood yang dipilih siswa saat curhat.</p>
          <div className="mt-4 space-y-2.5">
            {MOOD_OPTIONS.map((m) => (
              <BarRow
                key={m}
                label={MOOD_LABEL[m]}
                emoji={MOOD_EMOJI[m]}
                jumlah={perMood[m]}
                maksimum={maksMood}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Tren 6 Bulan Terakhir</h2>
        <p className="mt-0.5 text-xs text-slate-400">Jumlah curhatan masuk per bulan.</p>
        <div className="mt-5 flex items-end gap-3" style={{ height: 140 }}>
          {trenBulanan.map((t) => {
            const tinggi = maksTren > 0 ? Math.max((t.jumlah / maksTren) * 100, t.jumlah > 0 ? 4 : 2) : 2;
            return (
              <div key={t.bulan} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-700">{t.jumlah}</span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-admin-500"
                    style={{ height: `${tinggi}%` }}
                    title={`${t.label}: ${t.jumlah}`}
                  />
                </div>
                <span className="text-[11px] text-slate-500">{t.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
