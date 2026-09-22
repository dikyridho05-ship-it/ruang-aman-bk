"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  setGuruAktifAction,
  deleteGuruAction,
  resetPasswordGuruAction,
} from "@/actions/guru";
import type { GuruAccount } from "@/types/admin";
import ConfirmDialog from "@/components/ConfirmDialog";
import ResetPasswordGuruDialog from "@/components/ResetPasswordGuruDialog";

export default function GuruList({ guru }: { guru: GuruAccount[] }) {
  const router = useRouter();
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  // Sebelumnya window.confirm() langsung di sini — diganti dengan modal
  // custom (ConfirmDialog) di bawah supaya gaya visualnya konsisten
  // dengan modal lain di app. confirmTarget menyimpan akun yang MENUNGGU
  // konfirmasi hapus, null berarti dialog tertutup.
  const [confirmTarget, setConfirmTarget] = useState<GuruAccount | null>(null);
  const [resetTarget, setResetTarget] = useState<GuruAccount | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  async function handleToggle(g: GuruAccount) {
    setPendingUid(g.uid);
    setError(null);
    setSukses(null);
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
    setSukses(null);
    const result = await deleteGuruAction(g.uid, g.nama);
    setPendingUid(null);
    setConfirmTarget(null);
    if (!result.success) {
      setError(result.error ?? "Gagal menghapus akun.");
      return;
    }
    router.refresh();
  }

  async function handleResetPassword(passwordBaru: string) {
    if (!resetTarget) return;
    const g = resetTarget;

    setPendingUid(g.uid);
    setResetError(null);
    setError(null);
    setSukses(null);
    const result = await resetPasswordGuruAction(g.uid, passwordBaru);
    setPendingUid(null);

    if (!result.success) {
      // Modal sengaja dibiarkan terbuka: passwordnya masih terketik di
      // sana, jadi Super Admin tinggal memperbaiki yang salah (mis. terlalu
      // pendek) tanpa mengetik ulang dari nol.
      setResetError(result.error ?? "Gagal mengatur ulang password.");
      return;
    }

    setResetTarget(null);
    setSukses(
      `Password ${g.nama} sudah diatur ulang. Sesi lamanya dicabut — dia perlu masuk lagi dengan password baru itu.`,
    );
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

      {sukses && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {sukses}
        </div>
      )}

      <ul className="space-y-2">
        {guru.map((g) => {
          const busy = pendingUid === g.uid;
          return (
            <li
              key={g.uid}
              // Tiga tombol tidak muat sebaris dengan nama di layar sempit:
              // di HP baris ini menumpuk, mulai layar sedang baru sejajar.
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{g.nama}</p>
                <p className="truncate text-xs text-slate-500">{g.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
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
                  onClick={() => {
                    setResetError(null);
                    setSukses(null);
                    setResetTarget(g);
                  }}
                  disabled={busy}
                  className="rounded-lg border border-admin-500 px-2.5 py-1.5 text-xs font-medium text-admin-700 disabled:opacity-50"
                >
                  Atur Ulang Password
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

      <ResetPasswordGuruDialog
        target={resetTarget}
        pending={pendingUid === resetTarget?.uid}
        error={resetError}
        onSubmit={handleResetPassword}
        onCancel={() => {
          setResetTarget(null);
          setResetError(null);
        }}
      />
    </div>
  );
}
