"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { jamSekolah, kunciHari, tanggalPendek } from "@/lib/waktu";
import { MOOD_EMOJI, labelKategori, type TicketRow, type TicketStatus } from "@/types/ticket";

const STATUS_BADGE: Record<TicketStatus, string> = {
  baru: "bg-amber-100 text-amber-700",
  dibaca: "bg-slate-100 text-slate-600",
  dibalas: "bg-blue-100 text-blue-700",
  selesai: "bg-emerald-100 text-emerald-700",
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  baru: "Baru",
  dibaca: "Dibaca",
  dibalas: "Dibalas",
  selesai: "Selesai",
};

// Batas iterasi auto-lanjut saat saringan "Tugas Saya" aktif — lihat
// komentar di handleLoadMore. Mencegah satu klik memicu request beruntun
// tanpa henti kalau guru itu kebetulan tidak ditugaskan ke banyak tiket.
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
  const [hanyaTugasSaya, setHanyaTugasSaya] = useState(false);
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
   * dimuat guru.
   *
   * Daftar ini dirender oleh LAYOUT, yang tidak ikut dirender ulang saat
   * berpindah antar tiket — tapi ia dirender ulang setiap kali sebuah aksi
   * memanggil router.refresh() (tandai selesai, ubah penugasan). Tanpa
   * penyerapan di bawah, `tickets` menahan salinan pertamanya selamanya:
   * tiket yang barusan ditandai selesai tetap berlabel "Dibalas" di kiri
   * sampai halaman dimuat ulang sepenuhnya.
   *
   * Penggabungan lewat Map (bukan setTickets(initialTickets) mentah) supaya
   * hasil "Muat lebih banyak" tidak lenyap setiap kali daftar disegarkan;
   * data server menimpa entri dengan kode yang sama karena itu yang paling
   * mutakhir.
   */
  useEffect(() => {
    setTickets((prev) => {
      const gabungan = new Map(prev.map((t) => [t.kode, t]));
      for (const t of initialTickets) gabungan.set(t.kode, t);
      return [...gabungan.values()];
    });
  }, [initialTickets]);

  const terlihat = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hasil = tickets.filter((t) => {
      if (hanyaTugasSaya && t.guruDitugaskan?.uid !== guruUid) return false;
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
  }, [tickets, hanyaTugasSaya, query, guruUid]);

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
      prev.map((t) => (t.kode === kode && t.status === "baru" ? { ...t, status: "dibaca" } : t)),
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

        dapatYangCocok = hanyaTugasSaya
          ? halamanMentah.some((t) => t.guruDitugaskan?.uid === guruUid)
          : halamanMentah.length > 0;

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
  }, [cursorMs, hasMore, hanyaTugasSaya, guruUid]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3">
      {panelRingkas}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="shrink-0 space-y-3 border-b border-slate-100 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">Curhatan</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
              {terlihat.length}
            </span>
          </div>

          <div className="flex gap-2">
            <Chip aktif={!hanyaTugasSaya} onClick={() => setHanyaTugasSaya(false)}>
              Semua
            </Chip>
            <Chip aktif={hanyaTugasSaya} onClick={() => setHanyaTugasSaya(true)}>
              Tugas Saya
            </Chip>
          </div>

          {/* Pencarian bekerja pada tiket yang SUDAH dimuat di layar ini,
              bukan query baru ke Firestore — pencarian teks bebas di
              Firestore butuh indeks/layanan terpisah, sementara yang
              dibutuhkan guru sehari-hari cuma menemukan lagi tiket yang
              barusan dilihatnya di antrean terbaru. */}
          <label className="relative block">
            <span className="sr-only">Cari curhatan</span>
            <IkonCari className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul, kode, kategori..."
              className="min-h-[2.5rem] w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm
                outline-none placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500"
            />
          </label>
        </div>

        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {terlihat.length === 0 && (
            <li className="px-3 py-10 text-center text-sm text-slate-400">
              {tickets.length === 0
                ? "Belum ada curhatan masuk."
                : "Tidak ada curhatan yang cocok dengan pencarian atau saringan ini."}
            </li>
          )}

          {terlihat.map((t) => {
            const aktif = pathname === `/guru/${t.kode}`;
            return (
              <li key={t.kode}>
                <Link
                  href={`/guru/${t.kode}`}
                  onClick={() => tandaiDibacaLokal(t.kode)}
                  aria-current={aktif ? "page" : undefined}
                  className={`flex items-start gap-3 rounded-xl p-2.5 transition
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      aktif
                        ? "bg-brand-600 text-white shadow-sm"
                        : t.prioritas
                          ? "bg-red-50/60 hover:bg-red-50"
                          : "hover:bg-slate-50"
                    }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                      aktif ? "bg-white/15" : "bg-slate-100"
                    }`}
                  >
                    {MOOD_EMOJI[t.mood]}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate text-sm font-semibold ${
                          aktif ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {t.judul}
                      </span>
                      <span
                        className={`shrink-0 text-[11px] ${
                          aktif ? "text-white/70" : "text-slate-400"
                        }`}
                      >
                        {waktuSingkat(t.createdAtMs)}
                      </span>
                    </span>

                    <span
                      className={`mt-0.5 block truncate text-xs ${
                        aktif ? "text-white/70" : "text-slate-500"
                      }`}
                    >
                      {t.kode} &middot; {labelKategori(t.kategori)}
                    </span>

                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          aktif ? "bg-white/15 text-white" : STATUS_BADGE[t.status]
                        }`}
                      >
                        {STATUS_LABEL[t.status]}
                      </span>
                      {t.prioritas && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            aktif ? "bg-white/15 text-white" : "bg-red-100 text-red-700"
                          }`}
                        >
                          🔴 Segera
                        </span>
                      )}
                      <span
                        className={`truncate text-[11px] ${
                          aktif ? "text-white/70" : "text-slate-400"
                        }`}
                      >
                        {t.guruDitugaskan ? `→ ${t.guruDitugaskan.nama}` : "Belum ditugaskan"}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {(error || hasMore) && (
          <div className="shrink-0 space-y-2 border-t border-slate-100 p-3">
            {error && (
              <p
                role="alert"
                aria-live="assertive"
                className="rounded-xl border border-red-200 bg-red-50 p-2 text-center text-xs text-red-700"
              >
                {error}
              </p>
            )}
            {hasMore && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loading}
                className="min-h-[2.5rem] w-full rounded-xl border border-slate-200 bg-white text-sm font-semibold text-brand-700
                  hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-brand-500 disabled:opacity-60"
              >
                {loading ? "Memuat..." : "Muat lebih banyak"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      className={`min-h-[2.25rem] rounded-full px-3.5 text-xs font-semibold transition
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          aktif
            ? "bg-brand-600 text-white shadow-sm"
            : "border border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-700"
        }`}
    >
      {children}
    </button>
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
