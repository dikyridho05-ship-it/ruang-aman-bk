import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { listGuruAction } from "@/actions/guru";
import AddGuruForm from "@/components/AddGuruForm";
import GuruList from "@/components/GuruList";

export const dynamic = "force-dynamic";

export default async function GuruBkPage() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) redirect("/login");

  const result = await listGuruAction();
  const guru = result.success ? result.guru : [];

  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-slate-900">Akun Guru BK</h1>

      {!result.success && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {result.error}
        </div>
      )}

      <div className="mb-4">
        <AddGuruForm />
      </div>

      <GuruList guru={guru} />
    </main>
  );
}
