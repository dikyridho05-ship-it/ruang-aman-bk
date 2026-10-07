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
    <main className="max-w-3xl">

      {!result.success && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 rounded-lg border-l-4 border-red-500 bg-red-50 px-3.5 py-3 text-sm text-red-800"
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
