import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { listCurhatanAction } from "@/actions/curhatan";
import CurhatanList from "@/components/CurhatanList";

export const dynamic = "force-dynamic";

export default async function CurhatanPage() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) redirect("/login");

  const result = await listCurhatanAction();
  const curhatan = result.success ? result.curhatan : [];

  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold text-slate-900">Curhatan</h1>
      <p className="mb-4 text-sm text-slate-500">
        Kelola tiket curhatan siswa — pilih tiket tertentu atau hapus semuanya sekaligus.
      </p>

      {!result.success && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {result.error}
        </div>
      )}

      <CurhatanList curhatan={curhatan} />
    </main>
  );
}
