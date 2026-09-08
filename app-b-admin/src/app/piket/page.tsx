import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { listGuruAction } from "@/actions/guru";
import { getJadwalPiket } from "@/lib/firestore/piket";
import PiketForm from "@/components/PiketForm";

export const dynamic = "force-dynamic";

export default async function PiketPage() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) redirect("/login");

  const [guruResult, jadwal] = await Promise.all([listGuruAction(), getJadwalPiket()]);
  const guruAktif = guruResult.success ? guruResult.guru.filter((g) => g.aktif) : [];

  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold text-slate-900">Jadwal Piket Guru BK</h1>
      <p className="mb-4 text-sm text-slate-500">
        Atur Guru BK yang bertugas tiap hari — jadwalnya juga tampil di dashboard Guru BK (App A)
        supaya semua tahu siapa piket hari itu, terutama menjelang musim ujian.
      </p>

      <PiketForm guruOptions={guruAktif} initial={jadwal} />
    </main>
  );
}
