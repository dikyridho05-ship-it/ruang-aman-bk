import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { getSekolahSettings } from "@/lib/firestore/settings";
import AuthBingkai from "@/components/auth/AuthBingkai";
import FormDaftar from "@/components/auth/FormDaftar";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ajukan akses — Ruang Aman BK" };

export default async function DaftarPage() {
  if (await getAuthenticatedAdmin()) redirect("/");
  const sekolah = await getSekolahSettings();

  return (
    <AuthBingkai namaSekolah={sekolah.namaSekolah} logoBase64={sekolah.logoBase64}>
      <FormDaftar namaSekolah={sekolah.namaSekolah} />
    </AuthBingkai>
  );
}
