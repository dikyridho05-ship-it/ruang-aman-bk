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
    <main className="max-w-3xl">
      <p className="mb-6 max-w-2xl text-[15px] text-slate-600">
        Atur Guru BK yang bertugas tiap hari — jadwalnya juga tampil di dashboard Guru BK (App A)
        supaya semua tahu siapa piket hari itu, terutama menjelang musim ujian.
      </p>

      <PiketForm guruOptions={guruAktif} initial={jadwal} />
    </main>
  );
}
