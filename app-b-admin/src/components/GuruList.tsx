"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setGuruAktifAction, deleteGuruAction } from "@/actions/guru";
import type { GuruAccount } from "@/types/admin";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function GuruList({ guru }: { guru: GuruAccount[] }) {
  const router = useRouter();
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Sebelumnya window.confirm() langsung di sini — diganti dengan modal
  // custom (ConfirmDialog) di bawah supaya gaya visualnya konsisten
  // dengan modal lain di app. confirmTarget menyimpan akun yang MENUNGGU
  // konfirmasi hapus, null berarti dialog tertutup.
  const [confirmTarget, setConfirmTarget] = useState<GuruAccount | null>(null);

  async function handleToggle(g: GuruAccount) {
    setPendingUid(g.uid);
    setError(null);
    const result = await setGuruAktifAction(g.uid, !g.aktif, g.nama);
    setPendingUid(null);
    if (!result.success) {
      setError(result.error ?? "Gagal mengubah status.");
      return;
    }
    router.refresh();
  }

  async function handleConfirmDelete() {
    if (!confirmTarget) return;
    const g = confirmTarget;

    setPendingUid(g.uid);
    setError(null);
    const result = await deleteGuruAction(g.uid, g.nama);
    setPendingUid(null);
    setConfirmTarget(null);
    if (!result.success) {
      setError(result.error ?? "Gagal menghapus akun.");
      return;
    }
    router.refresh();
  }

  if (guru.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        Belum ada akun Guru BK.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <ul className="space-y-2">
        {guru.map((g) => {
          const busy = pendingUid === g.uid;
          return (
            <li
              key={g.uid}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{g.nama}</p>
                <p className="truncate text-xs text-slate-500">{g.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    g.aktif ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {g.aktif ? "Aktif" : "Nonaktif"}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle(g)}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
                >
                  {g.aktif ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmTarget(g)}
                  disabled={busy}
                  className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 disabled:opacity-50"
                >
                  Hapus
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirmTarget !== null}
        title="Hapus akun Guru BK?"
        description={
          confirmTarget
            ? `Hapus akun Guru BK "${confirmTarget.nama}" (${confirmTarget.email})? Tindakan ini tidak bisa dibatalkan.`
            : ""
        }
        pending={pendingUid === confirmTarget?.uid}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
