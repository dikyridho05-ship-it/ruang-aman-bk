import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { getTemplateBalasan } from "@/lib/firestore/template";
import TemplateBalasanManager from "@/components/TemplateBalasanManager";

export const dynamic = "force-dynamic";

export default async function TemplateBalasanPage() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) redirect("/login");

  const templates = await getTemplateBalasan();

  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold text-slate-900">Template Balasan Cepat</h1>
      <p className="mb-4 text-sm text-slate-500">
        Balasan siap pakai untuk Guru BK saat menjawab curhatan — muncul sebagai pilihan cepat di
        halaman chat, mempercepat waktu respons.
      </p>

      <TemplateBalasanManager initial={templates} />
    </main>
  );
}
