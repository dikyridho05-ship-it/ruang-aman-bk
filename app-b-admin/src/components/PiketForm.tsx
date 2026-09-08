"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePiketAction } from "@/actions/piket";
import { HARI_PIKET, HARI_PIKET_LABEL, type JadwalPiket } from "@/types/admin";

interface GuruOption {
  uid: string;
  nama: string;
}

export default function PiketForm({
  guruOptions,
  initial,
}: {
  guruOptions: GuruOption[];
  initial: JadwalPiket;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await updatePiketAction(formData);
    setSaving(false);

    if (!result.success) {
      setMessage({ type: "error", text: result.error ?? "Gagal menyimpan." });
      return;
    }
    setMessage({ type: "success", text: "Jadwal piket disimpan." });
    router.refresh();
  }

  if (guruOptions.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        Belum ada akun Guru BK aktif — tambahkan dulu di halaman Akun Guru BK.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {message && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {HARI_PIKET.map((hari) => (
          <div key={hari}>
            <span className="block text-sm font-medium text-slate-700">
              {HARI_PIKET_LABEL[hari]}
            </span>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-2">
              {guruOptions.map((g) => (
                <label key={g.uid} className="flex items-center gap-1.5 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    name={hari}
                    value={g.uid}
                    defaultChecked={initial[hari]?.includes(g.uid)}
                    className="h-4 w-4 rounded border-slate-300 text-admin-600 focus:ring-admin-500"
                  />
                  {g.nama}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-admin-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Menyimpan..." : "Simpan Jadwal Piket"}
      </button>
    </form>
  );
}
