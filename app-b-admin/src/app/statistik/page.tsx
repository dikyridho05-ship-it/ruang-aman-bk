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
    <main className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Statistik &amp; Laporan</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Ringkasan anonim untuk Kepala Sekolah — tidak ada judul, nama samaran, atau isi
            curhatan yang ditampilkan di sini.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/statistik/export/excel"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-admin-300"
          >
            📊 Unduh Excel
          </a>
          <a
            href="/statistik/export/pdf"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-admin-300"
          >
            📄 Unduh PDF
          </a>
        </div>
      </div>

      <StatistikView data={data} />
    </main>
  );
}
