import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { getAkunAdminData } from "@/actions/akun-admin";
import AkunAdminView from "@/components/AkunAdminView";

export const dynamic = "force-dynamic";

export default async function AkunAdminPage() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) redirect("/login");

  const data = await getAkunAdminData();
  if (!data.success) {
    return <p className="text-sm text-red-700">{data.error}</p>;
  }

  return <AkunAdminView adminSaatIni={admin.uid} admins={data.admins} permintaan={data.permintaan} />;
}
