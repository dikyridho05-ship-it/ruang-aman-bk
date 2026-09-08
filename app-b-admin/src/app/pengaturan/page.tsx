import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { getSekolahSettings } from "@/lib/firestore/settings";
import PengaturanForm from "@/components/PengaturanForm";
import RetensiForm from "@/components/RetensiForm";

export const dynamic = "force-dynamic";

export default async function PengaturanPage() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) redirect("/login");

  const settings = await getSekolahSettings();

  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-slate-900">Identitas Sekolah</h1>

      <PengaturanForm
        initialNamaSekolah={settings.namaSekolah}
        initialLogoBase64={settings.logoBase64}
      />

      <div className="mt-6">
        <RetensiForm initial={settings.retensi} />
      </div>
    </main>
  );
}
