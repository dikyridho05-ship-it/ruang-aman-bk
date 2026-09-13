"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGuruAction } from "@/actions/guru";

export default function AddGuruForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createGuruAction(formData);
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Gagal menambah akun.");
      return;
    }

    setNama("");
    setEmail("");
    setPassword("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-admin-600 px-4 py-2.5 text-sm font-semibold text-white"
      >
        + Tambah Akun Guru BK
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Akun Guru BK Baru</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          Batal
        </button>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="nama" className="block text-xs font-medium text-slate-700">
            Nama
          </label>
          <input
            id="nama"
            name="nama"
            required
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-admin-500"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-admin-500"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-slate-700">
            Password Awal
          </label>
          {/* Sebelumnya type="text" — password yang baru dibuat Super Admin
              tampil polos di layar (risiko diintip orang lain saat mengetik).
              Disamakan dengan PasswordField.tsx di App A: default tersembunyi,
              ada tombol "Lihat" untuk yang memang perlu memeriksa ketikannya. */}
          <div className="mt-1 flex items-center rounded-xl border border-slate-300 bg-white pr-2 focus-within:ring-2 focus-within:ring-admin-500">
            <input
              id="password"
              name="password"
              type={passwordVisible ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min. 6 karakter"
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => setPasswordVisible((v) => !v)}
              className="shrink-0 px-2 text-xs font-medium text-admin-700"
              aria-label={passwordVisible ? "Sembunyikan password" : "Tampilkan password"}
            >
              {passwordVisible ? "Sembunyikan" : "Lihat"}
            </button>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-admin-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Menyimpan..." : "Simpan Akun"}
      </button>
    </form>
  );
}
