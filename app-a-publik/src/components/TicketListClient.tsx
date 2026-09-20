"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  MOOD_EMOJI,
  labelKategori,
  type CurhatTicket,
  type TicketStatus,
} from "@/types/ticket";

const STATUS_BADGE: Record<TicketStatus, string> = {
  baru: "bg-amber-100 text-amber-700",
  dibaca: "bg-slate-100 text-slate-700",
  dibalas: "bg-blue-100 text-blue-700",
  selesai: "bg-emerald-100 text-emerald-700",
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  baru: "Baru",
  dibaca: "Dibaca",
  dibalas: "Dibalas",
  selesai: "Selesai",
};

export interface TicketRow {
  kode: string;
  kategori: CurhatTicket["kategori"];
  mood: CurhatTicket["mood"];
  judul: string;
  status: TicketStatus;
  createdAtMs: number;
  prioritas: boolean;
  guruDitugaskan: { uid: string; nama: string } | null;
}

interface TicketListClientProps {
  initialTickets: TicketRow[];
  guruUid: string;
  hanyaTugasSaya: boolean;
  /** createdAtMs tiket TERLAMA di halaman mentah (sebelum filter) pertama —
   * null kalau tidak ada tiket sama sekali. */
  initialCursorMs: number | null;
  /** true kalau halaman mentah pertama penuh (masih mungkin ada lagi). */
  initialHasMore: boolean;
}

// Batas iterasi auto-lanjut saat filter "Tugas Saya" aktif — lihat komentar
// di handleLoadMore. Mencegah satu klik memicu request beruntun tanpa henti
// kalau guru itu kebetulan tidak ditugaskan ke banyak tiket sama sekali.
const MAKS_AUTO_LANJUT = 6;

export function TicketListClient({
  initialTickets,
  guruUid,
  hanyaTugasSaya,
  initialCursorMs,
  initialHasMore,
}: TicketListClientProps) {
  const [tickets, setTickets] = useState<TicketRow[]>(initialTickets);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kursor & hasMore SENGAJA dilacak dari halaman MENTAH (sebelum filter
  // "Tugas Saya"), bukan dari `tickets` yang sudah tersaring untuk
  // ditampilkan. Sebelumnya kursor diambil dari tiket TERLIHAT — begitu satu
  // halaman mentah habis tersaring (0 tiket ditugaskan ke guru ini), kursor
  // itu tidak pernah maju lagi dan tombol "Muat lebih banyak" mengambil 50
  // baris mentah yang SAMA berulang-ulang. `hasMore` yang dihitung dari
  // daftar tersaring juga salah: guru dengan tugas < 50 tiket bisa jadi
  // tidak pernah melihat tombolnya sama sekali walau tiket mentahnya masih
  // banyak.
  const [cursorMs, setCursorMs] = useState<number | null>(initialCursorMs);
  const [hasMore, setHasMore] = useState(initialHasMore);

  // Sinkronkan ulang jika initialTickets berubah (misalnya navigasi filter).
  useEffect(() => {
    setTickets(initialTickets);
    setCursorMs(initialCursorMs);
    setHasMore(initialHasMore);
    setError(null);
  }, [initialTickets, initialCursorMs, initialHasMore]);

  const handleLoadMore = useCallback(async () => {
    if (cursorMs === null) return;
    setLoading(true);
    setError(null);

    let cursor = cursorMs;
    let lebihBanyak = hasMore;
    let tambahan: TicketRow[] = [];

    try {
      // Kalau filter "Tugas Saya" aktif, satu halaman mentah bisa saja 0
      // tiketnya ditugaskan ke guru ini — jadi lanjut ambil halaman mentah
      // berikutnya secara otomatis (dibatasi MAKS_AUTO_LANJUT) sampai
      // dapat setidaknya satu tiket baru untuk ditampilkan atau datanya
      // benar-benar habis, supaya guru tidak perlu klik berkali-kali untuk
      // hasil yang jarang.
      for (let i = 0; i < MAKS_AUTO_LANJUT && lebihBanyak && tambahan.length === 0; i++) {
        const res = await fetch(`/api/guru/tickets?lastCreatedAt=${cursor}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const halamanMentah: TicketRow[] = data.tickets || [];

        lebihBanyak = halamanMentah.length >= 50;
        cursor =
          halamanMentah.length > 0
            ? halamanMentah[halamanMentah.length - 1].createdAtMs
            : cursor;

        tambahan = hanyaTugasSaya
          ? halamanMentah.filter((t) => t.guruDitugaskan?.uid === guruUid)
          : halamanMentah;

        if (halamanMentah.length === 0) break;
      }

      setCursorMs(cursor);
      setHasMore(lebihBanyak);

      if (tambahan.length > 0) {
        setTickets((prev) => {
          const combined = [...prev, ...tambahan];
          // Urutkan ulang: prioritas di atas, lalu terbaru di atas.
          combined.sort((a, b) => {
            if (a.prioritas !== b.prioritas) return a.prioritas ? -1 : 1;
            return b.createdAtMs - a.createdAtMs;
          });

          // Hapus duplikat berdasarkan kode tiket.
          const unique = Array.from(
            new Map(combined.map((item) => [item.kode, item])).values(),
          );
          return unique;
        });
      }
    } catch (err) {
      console.error("Gagal memuat tiket:", err);
      setError("Gagal memuat tiket tambahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [cursorMs, hasMore, hanyaTugasSaya, guruUid]);

  if (tickets.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        {hanyaTugasSaya
          ? "Belum ada tiket yang ditugaskan ke kamu."
          : "Belum ada curhatan masuk."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {tickets.map((t) => (
          <li key={t.kode}>
            <Link
              href={`/guru/${t.kode}`}
              className={`flex items-center justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm hover:border-brand-300 ${
                t.prioritas
                  ? "border-red-300 ring-1 ring-red-100"
                  : "border-slate-200"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-start gap-2">
                  <span aria-hidden>{MOOD_EMOJI[t.mood]}</span>
                  <span className="line-clamp-2 font-semibold text-slate-900">
                    {t.judul}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {t.kode} &middot; {labelKategori(t.kategori)} &middot;{" "}
                  {new Date(t.createdAtMs).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                {t.prioritas && (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    🔴 Perlu Perhatian Segera
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {t.guruDitugaskan
                    ? `→ ${t.guruDitugaskan.nama}`
                    : "Belum ditugaskan"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[t.status]}`}
              >
                {STATUS_LABEL[t.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Pesan error jika fetch gagal */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 py-2.5 font-semibold text-white
              hover:bg-brand-700 disabled:opacity-60 sm:w-auto sm:px-6"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Memuat...
              </span>
            ) : (
              "Muat lebih banyak"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
