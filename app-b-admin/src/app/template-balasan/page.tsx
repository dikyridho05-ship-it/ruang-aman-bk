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
    <main className="max-w-3xl">
      <p className="mb-6 max-w-2xl text-[15px] text-slate-600">
        Balasan siap pakai untuk Guru BK saat menjawab curhatan — muncul sebagai pilihan cepat di
        halaman chat, mempercepat waktu respons.
      </p>

      <TemplateBalasanManager initial={templates} />
    </main>
  );
}
