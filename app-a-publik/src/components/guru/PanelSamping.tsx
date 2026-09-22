import Link from "next/link";
import type { GuruPiket } from "@/lib/firestore/piket";
import { MOOD_EMOJI, labelKategori, type TicketRow, type TicketStatus } from "@/types/ticket";

const URUTAN_STATUS: TicketStatus[] = ["baru", "dibaca", "dibalas", "selesai"];

const LABEL_STATUS: Record<TicketStatus, string> = {
  baru: "Baru",
  dibaca: "Dibaca",
  dibalas: "Dibalas",
  selesai: "Selesai",
};

const WARNA_TITIK_STATUS: Record<TicketStatus, string> = {
  baru: "bg-amber-400",
  dibaca: "bg-slate-300",
  dibalas: "bg-blue-400",
  selesai: "bg-emerald-400",
};

interface PanelSampingProps {
  piket: GuruPiket[];
  /** Seluruh tiket halaman pertama, SEBELUM disaring di daftar kiri. */
  tickets: TicketRow[];
  /**
   * Versi padat untuk layar di bawah xl, tempat panel kanan tidak muat dan
   * isinya ditumpangkan di atas daftar curhatan. Cuma memuat dua hal yang
   * benar-benar tidak boleh terlewat (piket & jumlah prioritas), karena di
   * layar sempit setiap baris tambahan memakan tinggi daftar.
   */
  ringkas?: boolean;
}

export default function PanelSamping({ piket, tickets, ringkas = false }: PanelSampingProps) {
  const prioritas = tickets.filter((t) => t.prioritas);

  if (ringkas) {
    if (piket.length === 0 && prioritas.length === 0) return null;

    return (
      <div className="space-y-2">
        {prioritas.length > 0 && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            🔴 {prioritas.length} curhatan perlu perhatian segera — sudah ditaruh paling atas.
          </p>
        )}
        {piket.length > 0 && (
          <p className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
            🗓️ Piket hari ini: {piket.map((g) => g.nama).join(", ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <KartuPanel judul="Perlu Perhatian">
        {prioritas.length === 0 ? (
          <p className="text-xs text-slate-400">
            Tidak ada curhatan berkategori berisiko yang masih terbuka.
          </p>
        ) : (
          <ul className="space-y-1">
            {prioritas.slice(0, 5).map((t) => (
              <li key={t.kode}>
                <Link
                  href={`/guru/${t.kode}`}
                  className="flex items-start gap-2 rounded-xl px-2 py-2 transition hover:bg-red-50
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <span aria-hidden className="text-base leading-5">
                    {MOOD_EMOJI[t.mood]}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-xs font-semibold text-slate-800">
                      {t.judul}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                      {labelKategori(t.kategori)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </KartuPanel>

      <KartuPanel judul="Piket Hari Ini">
        {piket.length === 0 ? (
          <p className="text-xs text-slate-400">Belum ada jadwal piket untuk hari ini.</p>
        ) : (
          <ul className="space-y-2">
            {piket.map((g) => (
              <li key={g.uid} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700"
                >
                  {inisial(g.nama)}
                </span>
                <span className="truncate text-xs font-medium text-slate-700">{g.nama}</span>
              </li>
            ))}
          </ul>
        )}
      </KartuPanel>

      <KartuPanel judul="Ringkasan">
        {/* Dihitung dari halaman pertama (50 tiket terbaru) saja — sengaja
            tidak dijual sebagai statistik sekolah, itu urusan App B. Di
            sini gunanya cuma memberi guru gambaran antrean hari-hari
            terakhir dalam sekali lihat. */}
        <ul className="space-y-1.5">
          {URUTAN_STATUS.map((status) => (
            <li key={status} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 text-slate-500">
                <span aria-hidden className={`h-2 w-2 rounded-full ${WARNA_TITIK_STATUS[status]}`} />
                {LABEL_STATUS[status]}
              </span>
              <span className="font-semibold text-slate-700">
                {tickets.filter((t) => t.status === status).length}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
          Dari {tickets.length} curhatan terbaru yang dimuat.
        </p>
      </KartuPanel>
    </div>
  );
}

function KartuPanel({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-bold text-slate-900">{judul}</h2>
      {children}
    </section>
  );
}

/** Inisial nama guru untuk avatar bulat — maksimal dua huruf. */
function inisial(nama: string): string {
  return nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? "")
    .join("");
}
