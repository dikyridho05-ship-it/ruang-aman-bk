"use client";

import { useState, useTransition } from "react";
import {
  setujuiPermintaanAction,
  tolakPermintaanAction,
  ubahStatusAdminAction,
} from "@/actions/akun-admin";
import type { AdminAccount, PermintaanAdmin } from "@/types/admin";
import { tanggalWaktu } from "@/lib/waktu";

export default function AkunAdminView({
  adminSaatIni,
  admins,
  permintaan,
}: {
  adminSaatIni: string;
  admins: AdminAccount[];
  permintaan: PermintaanAdmin[];
}) {
  const [galat, setGalat] = useState<string | null>(null);
  const [menunggu, startTransition] = useTransition();
  const [yangDiproses, setYangDiproses] = useState<string | null>(null);

  function jalankan(uid: string, aksi: () => Promise<{ success: boolean; error?: string }>) {
    setGalat(null);
    setYangDiproses(uid);
    startTransition(async () => {
      const hasil = await aksi();
      if (!hasil.success) setGalat(hasil.error ?? "Gagal. Coba lagi.");
      setYangDiproses(null);
    });
  }

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-labelledby="judul-permintaan">
        <h2 id="judul-permintaan" className="text-base font-bold text-admin-900">
          Permintaan akses
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Orang yang mendaftar lewat Google di halaman masuk. Setujui hanya kalau kamu mengenal
          orangnya — Super Admin bisa mengelola akun Guru BK dan identitas sekolah.
        </p>

        {galat && (
          <p role="alert" className="mt-4 rounded-lg border-l-4 border-red-500 bg-red-50 px-3.5 py-3 text-sm text-red-800">
            {galat}
          </p>
        )}

        {permintaan.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
            Tidak ada permintaan yang menunggu. Orang yang perlu akses bisa membuka halaman masuk
            App B lalu memilih “Ajukan akses dengan Google”.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-slate-200 rounded-xl bg-white ring-1 ring-slate-200">
            {permintaan.map((p) => {
              const sedang = menunggu && yangDiproses === p.uid;
              return (
                <li key={p.uid} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{p.nama}</p>
                    <p className="truncate text-sm text-slate-600">{p.email}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {p.peran}
                      {p.diajukanMs ? `, diajukan ${tanggalWaktu(p.diajukanMs)}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={menunggu}
                      onClick={() => jalankan(p.uid, () => tolakPermintaanAction(p.uid))}
                      className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      disabled={menunggu}
                      onClick={() => jalankan(p.uid, () => setujuiPermintaanAction(p.uid))}
                      className="rounded-lg bg-admin-800 px-3.5 py-2 text-sm font-semibold text-white hover:bg-admin-900 disabled:opacity-50"
                    >
                      {sedang ? "Memproses…" : "Setujui"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="judul-admin">
        <h2 id="judul-admin" className="text-base font-bold text-admin-900">
          Super Admin
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Menonaktifkan akun langsung mengeluarkannya dari semua perangkat. Minimal satu Super Admin
          harus tetap aktif.
        </p>
        <ul className="mt-5 divide-y divide-slate-200 rounded-xl bg-white ring-1 ring-slate-200">
          {admins.map((a) => {
            const diriSendiri = a.uid === adminSaatIni;
            const sedang = menunggu && yangDiproses === a.uid;
            return (
              <li key={a.uid} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${a.aktif ? "bg-emerald-500" : "bg-slate-300"}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${a.aktif ? "text-slate-900" : "text-slate-500"}`}>
                    {a.nama}
                    {diriSendiri && <span className="ml-2 text-xs font-normal text-slate-500">(kamu)</span>}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {a.email}
                    {!a.aktif && " — nonaktif"}
                  </p>
                </div>
                {!diriSendiri && (
                  <button
                    type="button"
                    disabled={menunggu}
                    onClick={() => jalankan(a.uid, () => ubahStatusAdminAction(a.uid, !a.aktif))}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-admin-700 hover:bg-admin-50 disabled:opacity-50"
                  >
                    {sedang ? "Memproses…" : a.aktif ? "Nonaktifkan" : "Aktifkan lagi"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
