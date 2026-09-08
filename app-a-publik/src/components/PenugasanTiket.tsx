"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GuruOption {
  uid: string;
  nama: string;
}

interface PenugasanTiketProps {
  guruOptions: GuruOption[];
  currentUid: string | null;
  onAssign: (guruUid: string | null) => Promise<{ success: boolean; error?: string }>;
}

/** Dropdown "Ditugaskan ke" di /guru/[kode] (TAHAP 8) — siapa pun Guru BK aktif bisa mengubahnya. */
export default function PenugasanTiket({ guruOptions, currentUid, onAssign }: PenugasanTiketProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setSaving(true);
    setError(null);
    const result = await onAssign(value === "" ? null : value);
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Gagal mengubah penugasan.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <label htmlFor="penugasan" className="block text-xs font-medium text-slate-500">
        Ditugaskan ke
      </label>
      <select
        id="penugasan"
        defaultValue={currentUid ?? ""}
        onChange={handleChange}
        disabled={saving}
        className="mt-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
      >
        <option value="">Belum ditugaskan</option>
        {guruOptions.map((g) => (
          <option key={g.uid} value={g.uid}>
            {g.nama}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
