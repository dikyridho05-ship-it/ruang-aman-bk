import type { SistemStatus } from "@/types/admin";

/**
 * Kartu "Kesehatan Sistem" di dashboard Super Admin (TAHAP 9; restyle
 * "Learning progress" — 3 kotak angka berwarna pastel, sesuai UI/UX
 * referensi yang diminta) — tampilkan kapan retensi otomatis terakhir jalan
 * (ditulis sendiri oleh `jalankanRetensi()`, lihat lib/retensi/jalankan.ts)
 * berikut jumlah dokumen tersimpan. Komponen server murni (tidak ada
 * interaksi), data sudah di-fetch sebelumnya lewat `getSistemStatus()` di
 * app/page.tsx.
 */
export default function StatusSistem({ status }: { status: SistemStatus }) {
  const { retensiTerakhir, totalTiket, totalAuditLog } = status;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Kesehatan Sistem</h2>
        {retensiTerakhir && (
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              retensiTerakhir.sukses
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                retensiTerakhir.sukses ? "bg-emerald-500" : "bg-red-500"
              }`}
              aria-hidden
            />
            Retensi terakhir: {retensiTerakhir.sukses ? "berhasil" : "gagal"}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-teal-50 p-4">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-teal-800">Total Curhatan Tersimpan</p>
            <span className="text-teal-500" aria-hidden>
              ↗
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-teal-900">{totalTiket}</p>
        </div>

        <div className="rounded-2xl bg-amber-50 p-4">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-amber-800">Ditutup Otomatis (Run Terakhir)</p>
            <span className="text-amber-500" aria-hidden>
              ↗
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-amber-900">
            {retensiTerakhir?.tutupCount ?? 0}
          </p>
        </div>

        <div className="rounded-2xl bg-violet-50 p-4">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-violet-800">Baris Audit Log</p>
            <span className="text-violet-500" aria-hidden>
              ↗
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-violet-900">{totalAuditLog}</p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        {retensiTerakhir === null ? (
          <p className="text-slate-400">Retensi otomatis belum pernah dijalankan.</p>
        ) : (
          <p className="text-slate-500">
            Run terakhir{" "}
            <span className="font-medium text-slate-700">
              {new Date(retensiTerakhir.waktuMs).toLocaleString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>{" "}
            &middot; {retensiTerakhir.tutupCount} ditutup, {retensiTerakhir.hapusCount} dihapus.
            {!retensiTerakhir.sukses && retensiTerakhir.pesanError && (
              <span className="ml-1 text-red-600">{retensiTerakhir.pesanError}</span>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
