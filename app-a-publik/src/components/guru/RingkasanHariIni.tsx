import Link from "next/link";
import type { GuruPiket } from "@/lib/firestore/piket";
import { labelJamJanji, labelWaktuJanji } from "@/lib/janji/aturan";
import { labelKategori, type TicketRow } from "@/types/ticket";
import type { JanjiRingkas } from "@/types/janji";
import PushSubscribeButton from "@/components/PushSubscribeButton";

interface Props {
  guruNama: string;
  tanggal: string;
  piket: GuruPiket[];
  tickets: TicketRow[];
  janjiHariIni: JanjiRingkas[];
  janjiMenunggu: JanjiRingkas[];
}

/**
 * Isi kolom tengah panel Guru BK saat belum ada curhatan yang dibuka:
 * apa yang perlu dikerjakan hari ini, diurutkan dari yang paling mendesak.
 * Menggantikan layar kosong "pilih curhatan" sebelumnya — di laptop,
 * kolom selebar ini terlalu berharga untuk dibiarkan berisi ikon saja.
 */
export default function RingkasanHariIni({
  guruNama,
  tanggal,
  piket,
  tickets,
  janjiHariIni,
  janjiMenunggu,
}: Props) {
  const prioritas = tickets.filter((t) => t.prioritas && (t.status === "baru" || t.status === "dibaca" || t.belumDibaca));
  const perluDibalas = tickets.filter(
    (t) => t.status !== "selesai" && (t.status === "baru" || t.status === "dibaca" || t.belumDibaca),
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto rounded-xl bg-white p-6 ring-1 ring-slate-200 xl:p-8">
      <p className="text-sm text-slate-500">{tanggal}</p>
      <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-tinta">Halo, {guruNama}</h2>
      <p className="mt-1 text-[15px] text-slate-600">
        {perluDibalas.length === 0
          ? "Semua curhatan yang dimuat sudah dibalas."
          : `${perluDibalas.length} curhatan menunggu balasanmu.`}
      </p>

      <div className="mt-8 grid gap-x-10 gap-y-8 xl:grid-cols-2">
        <Bagian judul="Prioritas belum dibalas" kosong="Tidak ada curhatan berisiko yang menunggu.">
          {prioritas.slice(0, 6).map((t) => (
            <Baris key={t.kode} href={`/guru/${t.kode}`} garis="bg-red-500">
              <span className="block truncate text-sm font-semibold text-tinta">{t.judul}</span>
              <span className="block truncate text-xs text-slate-500">{labelKategori(t.kategori)}</span>
            </Baris>
          ))}
        </Bagian>

        <Bagian judul="Janji temu hari ini" kosong="Tidak ada janji temu hari ini.">
          {janjiHariIni.map((j) => (
            <Baris key={j.id} href={`/guru/${j.kodeTiket}`} garis={j.status === "dikonfirmasi" ? "bg-brand-600" : "bg-amber-400"}>
              <span className="flex items-baseline gap-2">
                <span className="text-sm font-bold tabular-nums text-tinta">{labelJamJanji(j.waktuMulaiMs)}</span>
                <span className="font-mono text-xs text-slate-500">{j.kodeTiket}</span>
              </span>
              <span className="block text-xs text-slate-500">
                {j.status === "dikonfirmasi" ? `Dikonfirmasi${j.guruNama ? `, ${j.guruNama}` : ""}` : "Belum dikonfirmasi"}
              </span>
            </Baris>
          ))}
        </Bagian>

        <Bagian judul="Permintaan janji temu" kosong="Tidak ada permintaan yang menunggu.">
          {janjiMenunggu.slice(0, 6).map((j) => (
            <Baris key={j.id} href={`/guru/${j.kodeTiket}`} garis="bg-amber-400">
              <span className="block text-sm font-semibold tabular-nums text-tinta">{labelWaktuJanji(j.waktuMulaiMs)}</span>
              <span className="block font-mono text-xs text-slate-500">{j.kodeTiket}</span>
            </Baris>
          ))}
        </Bagian>

        <Bagian judul="Piket hari ini" kosong="Belum ada jadwal piket untuk hari ini.">
          {piket.length > 0 && (
            <li className="px-1 py-1 text-sm text-slate-700">{piket.map((g) => g.nama).join(", ")}</li>
          )}
        </Bagian>
      </div>

      <div className="mt-10 border-t border-slate-100 pt-5">
        <PushSubscribeButton />
      </div>
    </div>
  );
}

/** Versi dua-tiga baris padat untuk HP, di atas daftar curhatan. */
export function RingkasanPadat({
  piket,
  tickets,
  janjiHariIni,
  janjiMenunggu,
}: Omit<Props, "guruNama" | "tanggal">) {
  const prioritas = tickets.filter((t) => t.prioritas && (t.status === "baru" || t.status === "dibaca" || t.belumDibaca));
  const baris: { teks: string; warna: string }[] = [];
  if (prioritas.length > 0)
    baris.push({ teks: `${prioritas.length} curhatan prioritas belum dibalas`, warna: "bg-red-500" });
  if (janjiMenunggu.length > 0)
    baris.push({ teks: `${janjiMenunggu.length} permintaan janji temu menunggu jawaban`, warna: "bg-amber-400" });
  if (janjiHariIni.length > 0)
    baris.push({
      teks: `Janji temu hari ini: ${janjiHariIni.map((j) => labelJamJanji(j.waktuMulaiMs)).join(", ")}`,
      warna: "bg-brand-600",
    });
  if (piket.length > 0) baris.push({ teks: `Piket: ${piket.map((g) => g.nama).join(", ")}`, warna: "bg-slate-300" });
  if (baris.length === 0) return null;

  return (
    <ul className="shrink-0 space-y-1.5 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200 lg:hidden">
      {baris.map((b) => (
        <li key={b.teks} className="flex items-center gap-2 text-xs text-slate-700">
          <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${b.warna}`} />
          {b.teks}
        </li>
      ))}
    </ul>
  );
}

function Bagian({
  judul,
  kosong,
  children,
}: {
  judul: string;
  kosong: string;
  children: React.ReactNode;
}) {
  const ada = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section>
      <h3 className="border-b border-slate-200 pb-2 text-sm font-bold text-tinta">{judul}</h3>
      {ada ? <ul className="mt-1">{children}</ul> : <p className="mt-3 text-sm text-slate-500">{kosong}</p>}
    </section>
  );
}

function Baris({ href, garis, children }: { href: string; garis: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="relative block rounded-md py-2.5 pl-4 pr-2 hover:bg-kertas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <span aria-hidden className={`absolute bottom-2.5 left-1 top-2.5 w-[3px] rounded-full ${garis}`} />
        {children}
      </Link>
    </li>
  );
}
