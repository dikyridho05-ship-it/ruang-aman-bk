import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { getAuditLog } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) redirect("/login");

  const entries = await getAuditLog(100);

  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold text-slate-900">Audit Log</h1>
      <p className="mb-4 text-sm text-slate-500">
        100 aktivitas Super Admin terbaru — akun Guru BK, pengaturan sekolah, dan retensi data.
      </p>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Belum ada aktivitas tercatat.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-900">{e.aksi}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  {new Date(e.waktuMs).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {e.detail && <p className="mt-1 text-sm text-slate-600">{e.detail}</p>}
              <p className="mt-1 text-xs text-slate-400">oleh {e.aktor}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
