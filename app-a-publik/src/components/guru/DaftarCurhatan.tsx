"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { jamSekolah, kunciHari, tanggalPendek } from "@/lib/waktu";
import { labelKategori, type TicketRow, type TicketStatus } from "@/types/ticket";

const STATUS_LABEL: Record<TicketStatus, string> = {
  baru: "Baru",
  dibaca: "Belum dibalas",
  dibalas: "Dibalas",
  selesai: "Selesai",
};

const STATUS_TITIK: Record<TicketStatus, string> = {
  baru: "bg-amber-500",
  dibaca: "bg-amber-300",
  dibalas: "bg-brand-500",
  selesai: "bg-emerald-500",
};

type Saringan = "semua" | "perlu" | "saya";

const SARINGAN: { id: Saringan; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "perlu", label: "Perlu dibalas" },
  { id: "saya", label: "Tugas saya" },
];

/** Tiket yang menunggu tindakan Guru BK: belum pernah dibalas, atau siswa menulis lagi. */
function perluDibalas(t: TicketRow): boolean {
  return t.status !== "selesai" && (t.status === "baru" || t.status === "dibaca" || t.belumDibaca);
}

// Batas iterasi auto-lanjut saat saringan aktif — lihat komentar di
// handleLoadMore. Mencegah satu klik memicu request beruntun tanpa henti.
const MAKS_AUTO_LANJUT = 6;

interface DaftarCurhatanProps {
  /** Halaman pertama tiket, MENTAH (belum disaring apa pun). */
  initialTickets: TicketRow[];
  guruUid: string;
  /** createdAtMs tiket TERLAMA di halaman mentah pertama — null kalau kosong. */
  initialCursorMs: number | null;
  /** true kalau halaman mentah pertama penuh (masih mungkin ada lagi). */
  initialHasMore: boolean;
  /**
   * Isi panel kanan versi padat, ditumpangkan di atas daftar untuk layar
   * yang tidak cukup lebar buat kolom ketiga.
   */
  panelRingkas?: React.ReactNode;
}

export default function DaftarCurhatan({
  initialTickets,
  guruUid,
  initialCursorMs,
  initialHasMore,
  panelRingkas,
}: DaftarCurhatanProps) {
  const pathname = usePathname();
  const [tickets, setTickets] = useState<TicketRow[]>(initialTickets);
  const [saringan, setSaringan] = useState<Saringan>("semua");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kursor & hasMore SENGAJA dilacak dari halaman MENTAH (sebelum saringan
  // "Tugas Saya"/pencarian), bukan dari daftar yang tampil. Kalau kursor
  // diambil dari tiket TERLIHAT, begitu satu halaman mentah habis tersaring
  // (0 tiket ditugaskan ke guru ini) kursornya tidak pernah maju dan tombol
  // "Muat lebih banyak" mengambil 50 baris mentah yang SAMA berulang-ulang.
  const [cursorMs, setCursorMs] = useState<number | null>(initialCursorMs);
  const [hasMore, setHasMore] = useState(initialHasMore);

  /**
   * Serap data server yang baru tanpa membuang halaman tambahan yang sudah
   * dimuat guru. Daftar ini dirender oleh LAYOUT, yang dirender ulang setiap
   * kali sebuah aksi memanggil router.refresh() — data server menimpa entri
   * dengan kode yang sama karena itu yang paling mutakhir. Dilakukan saat
   * render (bukan di useEffect) supaya tidak ada satu frame berisi data lama.
   */
  const [sumberTerakhir, setSumberTerakhir] = useState(initialTickets);
  if (sumberTerakhir !== initialTickets) {
    setSumberTerakhir(initialTickets);
    setTickets((prev) => {
      const gabungan = new Map(prev.map((t) => [t.kode, t]));
      for (const t of initialTickets) gabungan.set(t.kode, t);
      return [...gabungan.values()];
    });
  }

  const cocokSaringan = useCallback(
    (t: TicketRow) =>
      saringan === "semua" ||
      (saringan === "perlu" && perluDibalas(t)) ||
      (saringan === "saya" && t.guruDitugaskan?.uid === guruUid),
    [saringan, guruUid],
  );

  const jumlahPerlu = useMemo(() => tickets.filter(perluDibalas).length, [tickets]);

  const terlihat = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hasil = tickets.filter((t) => {
      if (!cocokSaringan(t)) return false;
      if (!q) return true;
      return (
        t.judul.toLowerCase().includes(q) ||
        t.kode.toLowerCase().includes(q) ||
        labelKategori(t.kategori).toLowerCase().includes(q) ||
        (t.guruDitugaskan?.nama.toLowerCase().includes(q) ?? false)
      );
    });

    // Tiket prioritas (kategori berisiko tinggi, belum selesai) naik ke atas,
    // sisanya terbaru di atas.
    return hasil.sort((a, b) => {
      if (a.prioritas !== b.prioritas) return a.prioritas ? -1 : 1;
      return b.createdAtMs - a.createdAtMs;
    });
  }, [tickets, cocokSaringan, query]);

  /**
   * Turunkan status "baru" jadi "dibaca" di daftar begitu tiketnya dibuka.
   *
   * Server melakukan hal yang sama saat halaman tiket dirender (lihat
   * (panel)/[kode]/page.tsx), tapi daftar ini hidup di LAYOUT — dan layout
   * tidak ikut dirender ulang waktu guru berpindah antar tiket. Tanpa
   * penyesuaian lokal ini, tiket yang barusan dibaca tetap berlabel "Baru"
   * di kiri sampai halaman disegarkan, dan guru gampang membukanya lagi
   * mengira belum sempat terbaca.
   */
  const tandaiDibacaLokal = useCallback((kode: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.kode === kode
          ? { ...t, status: t.status === "baru" ? "dibaca" : t.status, belumDibaca: false }
          : t,
      ),
    );
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (cursorMs === null) return;
    setLoading(true);
    setError(null);

    let cursor = cursorMs;
    let lebihBanyak = hasMore;
    let dapatYangCocok = false;

    try {
      // Kalau saringan "Tugas Saya" aktif, satu halaman mentah bisa saja 0
      // tiketnya ditugaskan ke guru ini — jadi lanjut ambil halaman mentah
      // berikutnya secara otomatis (dibatasi MAKS_AUTO_LANJUT) sampai dapat
      // setidaknya satu tiket baru yang akan terlihat, supaya guru tidak
      // perlu mengklik berkali-kali untuk hasil yang jarang.
      for (let i = 0; i < MAKS_AUTO_LANJUT && lebihBanyak && !dapatYangCocok; i++) {
        const res = await fetch(`/api/guru/tickets?lastCreatedAt=${cursor}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const halamanMentah: TicketRow[] = data.tickets || [];

        lebihBanyak = halamanMentah.length >= 50;
        cursor =
          halamanMentah.length > 0
            ? halamanMentah[halamanMentah.length - 1].createdAtMs
            : cursor;

        dapatYangCocok = halamanMentah.some(cocokSaringan);

        if (halamanMentah.length > 0) {
          setTickets((prev) => {
            const gabungan = [...prev, ...halamanMentah];
            // Hapus duplikat berdasarkan kode tiket.
            return Array.from(new Map(gabungan.map((t) => [t.kode, t])).values());
          });
        }

        if (halamanMentah.length === 0) break;
      }

      setCursorMs(cursor);
      setHasMore(lebihBanyak);
    } catch (err) {
      console.error("Gagal memuat tiket:", err);
      setError("Gagal memuat tiket tambahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [cursorMs, hasMore, cocokSaringan]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3">
      {panelRingkas}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="shrink-0 space-y-3 border-b border-slate-200 px-4 pb-3 pt-4">
          <h2 className="text-base font-bold text-tinta">Curhatan masuk</h2>

          <div role="group" aria-label="Saring curhatan" className="flex gap-1 rounded-lg bg-kertas p-1">
            {SARINGAN.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={saringan === f.id}
                onClick={() => setSaringan(f.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  saringan === f.id ? "bg-white text-tinta shadow-[0_1px_2px_rgba(12,35,64,0.12)]" : "text-slate-500 hover:text-tinta"
                }`}
              >
                {f.label}
                {f.id === "perlu" && jumlahPerlu > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold leading-4 text-white">
                    {jumlahPerlu}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Pencarian bekerja pada tiket yang SUDAH dimuat, bukan query baru
              ke Firestore (pencarian teks bebas butuh layanan terpisah). */}
          <label className="relative block">
            <span className="sr-only">Cari curhatan</span>
            <IkonCari className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul, kode, atau kategori"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
          </label>
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
          {terlihat.length === 0 && (
            <li className="px-4 py-10 text-center text-sm leading-relaxed text-slate-500">
              {tickets.length === 0
                ? "Belum ada curhatan masuk. Curhatan baru muncul di sini begitu siswa mengirimnya."
                : saringan === "perlu"
                  ? "Semua curhatan sudah dibalas."
                  : "Tidak ada curhatan yang cocok."}
            </li>
          )}

          {terlihat.map((t) => {
            const aktif = pathname === `/guru/${t.kode}`;
            const tebal = t.status === "baru" || t.belumDibaca;
            return (
              <li key={t.kode}>
                <Link
                  href={`/guru/${t.kode}`}
                  onClick={() => tandaiDibacaLokal(t.kode)}
                  aria-current={aktif ? "page" : undefined}
                  className={`relative block px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${
                    aktif ? "bg-brand-50" : "hover:bg-kertas"
                  }`}
                >
                  {/* Garis kiri: merah untuk prioritas, biru untuk yang sedang dibuka. */}
                  {(t.prioritas || aktif) && (
                    <span
                      aria-hidden
                      className={`absolute inset-y-0 left-0 w-[3px] ${t.prioritas ? "bg-red-500" : "bg-brand-600"}`}
                    />
                  )}
                  <span className="flex items-baseline gap-2">
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        tebal ? "font-bold text-tinta" : "font-medium text-slate-700"
                      }`}
                    >
                      {t.judul}
                    </span>
                    <span className={`shrink-0 text-[11px] tabular-nums ${tebal ? "font-semibold text-brand-700" : "text-slate-400"}`}>
                      {waktuSingkat(t.createdAtMs)}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {labelKategori(t.kategori)}
                  </span>
                  <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${STATUS_TITIK[t.status]}`} />
                    <span className="font-medium text-slate-600">{STATUS_LABEL[t.status]}</span>
                    {t.belumDibaca && t.status !== "baru" && (
                      <span className="font-semibold text-brand-700">pesan baru</span>
                    )}
                    {t.prioritas && <span className="font-semibold text-red-700">prioritas</span>}
                    <span className="ml-auto truncate">
                      {t.guruDitugaskan ? t.guruDitugaskan.nama : <span className="text-slate-400">Belum ditangani</span>}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {(error || hasMore) && (
          <div className="shrink-0 space-y-2 border-t border-slate-200 p-3">
            {error && (
              <p role="alert" className="rounded-lg border-l-4 border-red-500 bg-red-50 px-3 py-2 text-xs text-red-800">
                {error}
              </p>
            )}
            {hasMore && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loading}
                className="w-full rounded-lg py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
              >
                {loading ? "Memuat…" : "Muat curhatan lebih lama"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Jam untuk tiket hari ini, tanggal pendek untuk yang lebih lama — selalu
 * menurut waktu sekolah, supaya teks yang dirender server sama persis
 * dengan yang dihitung browser (lihat lib/waktu.ts).
 */
function waktuSingkat(ms: number): string {
  return kunciHari(ms) === kunciHari(Date.now()) ? jamSekolah(ms) : tanggalPendek(ms);
}

function IkonCari({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
