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
    <main className="max-w-3xl">
      <p className="mb-6 max-w-2xl text-[15px] text-slate-600">
        Kelola tiket curhatan siswa — pilih tiket tertentu atau hapus semuanya sekaligus.
      </p>

      {!result.success && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 rounded-lg border-l-4 border-red-500 bg-red-50 px-3.5 py-3 text-sm text-red-800"
        >
          {result.error}
        </div>
      )}

      <CurhatanList curhatan={curhatan} />
    </main>
  );
}
