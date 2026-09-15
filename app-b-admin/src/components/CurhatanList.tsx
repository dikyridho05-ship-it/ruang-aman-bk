"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteAllCurhatanAction,
  deleteCurhatanAction,
  type CurhatanRow,
} from "@/actions/curhatan";
import { KATEGORI_CURHAT_LABEL, MOOD_EMOJI, STATUS_LABEL, type TicketStatus } from "@/types/statistik";
import ConfirmDialog from "@/components/ConfirmDialog";

const STATUS_BADGE: Record<TicketStatus, string> = {
  baru: "bg-amber-100 text-amber-700",
  dibaca: "bg-slate-100 text-slate-700",
  dibalas: "bg-blue-100 text-blue-700",
  selesai: "bg-emerald-100 text-emerald-700",
};

type ConfirmMode = "selected" | "all" | null;

export default function CurhatanList({ curhatan }: { curhatan: CurhatanRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);

  const semuaTerpilih = curhatan.length > 0 && selected.size === curhatan.length;

  function toggleSatu(kode: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kode)) next.delete(kode);
      else next.add(kode);
      return next;
    });
  }

  function toggleSemua() {
    setSelected(semuaTerpilih ? new Set() : new Set(curhatan.map((c) => c.kode)));
  }

  async function handleConfirmDelete() {
    setPending(true);
    setError(null);

    const result =
      confirmMode === "all"
        ? await deleteAllCurhatanAction()
        : await deleteCurhatanAction(Array.from(selected));

    setPending(false);
    setConfirmMode(null);

    if (!result.success) {
      setError(result.error ?? "Gagal menghapus tiket.");
      return;
    }

    setSelected(new Set());
    router.refresh();
  }

  const deskripsiKonfirmasi = useMemo(() => {
    if (confirmMode === "all") {
      return `Hapus SEMUA ${curhatan.length} tiket curhatan beserta seluruh riwayat chat-nya? Tindakan ini tidak bisa dibatalkan.`;
    }
    if (confirmMode === "selected") {
      return `Hapus ${selected.size} tiket curhatan terpilih beserta riwayat chat-nya? Tindakan ini tidak bisa dibatalkan.`;
    }
    return "";
  }, [confirmMode, curhatan.length, selected.size]);

  if (curhatan.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        Belum ada tiket curhatan.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={semuaTerpilih}
            onChange={toggleSemua}
            className="h-4 w-4 rounded border-slate-300"
          />
          Pilih semua ({curhatan.length})
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmMode("selected")}
            disabled={selected.size === 0 || pending}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-40"
          >
            Hapus Terpilih ({selected.size})
          </button>
          <button
            type="button"
            onClick={() => setConfirmMode("all")}
            disabled={pending}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Hapus Semua
          </button>
        </div>
      </div>

      <ul className="space-y-2">
        {curhatan.map((c) => {
          const dipilih = selected.has(c.kode);
          return (
            <li
              key={c.kode}
              className={`flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm ${
                dipilih ? "border-red-300 ring-1 ring-red-100" : "border-slate-200"
              }`}
            >
              <input
                type="checkbox"
                checked={dipilih}
                onChange={() => toggleSatu(c.kode)}
                className="h-4 w-4 shrink-0 rounded border-slate-300"
                aria-label={`Pilih tiket ${c.kode}`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                  {c.mood ? <span aria-hidden>{MOOD_EMOJI[c.mood]} </span> : null}
                  {c.kode}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {c.kategori.length > 0
                    ? c.kategori.map((k) => KATEGORI_CURHAT_LABEL[k]).join(", ")
                    : "Tanpa kategori"}
                  {c.createdAtMs
                    ? ` · ${new Date(c.createdAtMs).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}`
                    : ""}
                </p>
              </div>
              {c.status && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[c.status]}`}
                >
                  {STATUS_LABEL[c.status]}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirmMode !== null}
        title={confirmMode === "all" ? "Hapus semua tiket curhatan?" : "Hapus tiket terpilih?"}
        description={deskripsiKonfirmasi}
        pending={pending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmMode(null)}
      />
    </div>
  );
}
