import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { getStatistikCurhatan } from "@/lib/firestore/statistik";
import StatistikView from "@/components/StatistikView";

export const dynamic = "force-dynamic";

export default async function StatistikPage() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) redirect("/login");

  const data = await getStatistikCurhatan();

  return (
    <main className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="max-w-xl text-[15px] text-slate-600">
            Ringkasan anonim untuk Kepala Sekolah — tidak ada judul, nama samaran, atau isi
            curhatan yang ditampilkan di sini.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/statistik/export/excel"
            className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-admin-800 ring-1 ring-slate-300 hover:ring-admin-400"
          >
            Unduh Excel
          </a>
          <a
            href="/statistik/export/pdf"
            className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-admin-800 ring-1 ring-slate-300 hover:ring-admin-400"
          >
            Unduh PDF
          </a>
        </div>
      </div>

      <StatistikView data={data} />
    </main>
  );
}
