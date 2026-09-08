import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { getSistemStatus } from "@/lib/status/sistem";
import { getJadwalPiketDenganNama } from "@/lib/firestore/piket";
import { getTemplateBalasan } from "@/lib/firestore/template";
import { getSemuaEventKalender } from "@/lib/kalender/data-nasional";
import StatusSistem from "@/components/StatusSistem";
import DashboardCalendar from "@/components/DashboardCalendar";
import type { HariPiket } from "@/types/admin";

export const dynamic = "force-dynamic";

const HARI_BY_JS_DAY: HariPiket[] = [
  "minggu",
  "senin",
  "selasa",
  "rabu",
  "kamis",
  "jumat",
  "sabtu",
];

export default async function AdminHomePage() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) redirect("/login");

  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const [status, jadwalPiket, templates] = await Promise.all([
    getSistemStatus(),
    getJadwalPiketDenganNama(),
    getTemplateBalasan(),
  ]);

  const piketHariIni = jadwalPiket[HARI_BY_JS_DAY[now.getDay()]] ?? [];
  const events = getSemuaEventKalender();

  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-8">
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Aktivitas Hari Ini</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/piket"
              className="rounded-2xl bg-emerald-50 p-5 shadow-sm transition hover:bg-emerald-100"
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl" aria-hidden>
                  🗓️
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                  ↗
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-emerald-900">Piket Hari Ini</h3>
              {piketHariIni.length === 0 ? (
                <p className="mt-1 text-sm text-emerald-700/70">Belum ada jadwal piket.</p>
              ) : (
                <>
                  <div className="mt-2 flex -space-x-2">
                    {piketHariIni.slice(0, 5).map((g) => (
                      <span
                        key={g.uid}
                        title={g.nama}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-50 bg-emerald-600 text-xs font-bold text-white"
                      >
                        {g.nama.charAt(0).toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 truncate text-sm text-emerald-800">
                    {piketHariIni.map((g) => g.nama).join(", ")}
                  </p>
                </>
              )}
            </Link>

            <Link
              href="/template-balasan"
              className="rounded-2xl bg-pink-50 p-5 shadow-sm transition hover:bg-pink-100"
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl" aria-hidden>
                  💬
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-pink-600 shadow-sm">
                  ↗
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-pink-900">Template Balasan Cepat</h3>
              <p className="mt-2 text-3xl font-extrabold text-pink-900">{templates.length}</p>
              <p className="mt-1 truncate text-sm text-pink-700/70">
                {templates.length === 0
                  ? "Belum ada template dibuat."
                  : `Terbaru: ${templates[0].judul}`}
              </p>
            </Link>
          </div>
        </section>

        <StatusSistem status={status} />
      </div>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <DashboardCalendar todayIso={todayIso} jadwalPiket={jadwalPiket} events={events} />
      </div>
    </main>
  );
}
