import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { getSekolahSettings, getLatarBeranda } from "@/lib/firestore/settings";
import PengaturanForm from "@/components/PengaturanForm";
import LatarBerandaForm from "@/components/LatarBerandaForm";
import RetensiForm from "@/components/RetensiForm";
import KodeAksesForm from "@/components/KodeAksesForm";
import { getKodeAksesAdmin } from "@/actions/akses";

export const dynamic = "force-dynamic";

export default async function PengaturanPage() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) redirect("/login");

  const [settings, latar, kodeAkses] = await Promise.all([
    getSekolahSettings(),
    getLatarBeranda(),
    getKodeAksesAdmin(),
  ]);

  return (
    <main className="max-w-3xl">

      {kodeAkses && (
        <div className="mb-6">
          <KodeAksesForm initial={kodeAkses} />
        </div>
      )}

      <PengaturanForm
        initialNamaSekolah={settings.namaSekolah}
        initialLogoBase64={settings.logoBase64}
      />

      <div className="mt-6">
        <LatarBerandaForm initialFotoBase64={latar.fotoBase64} />
      </div>

      <div className="mt-6">
        <RetensiForm initial={settings.retensi} />
      </div>
    </main>
  );
}
