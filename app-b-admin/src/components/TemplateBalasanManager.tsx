"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
} from "@/actions/template";
import type { TemplateBalasan } from "@/types/admin";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function TemplateBalasanManager({ initial }: { initial: TemplateBalasan[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateBalasan | null>(null);
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // window.confirm() sebelumnya dipanggil langsung di handleDelete — diganti
  // modal custom (ConfirmDialog) biar konsisten secara visual dengan modal
  // lain di app. confirmTarget = template yang menunggu konfirmasi hapus.
  const [confirmTarget, setConfirmTarget] = useState<TemplateBalasan | null>(null);

  function startAdd() {
    setEditing(null);
    setJudul("");
    setIsi("");
    setError(null);
    setOpen(true);
  }

  function startEdit(t: TemplateBalasan) {
    setEditing(t);
    setJudul(t.judul);
    setIsi(t.isi);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = editing
      ? await updateTemplateAction(editing.id, formData)
      : await createTemplateAction(formData);
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Gagal menyimpan.");
      return;
    }
    setOpen(false);
    setEditing(null);
    router.refresh();
  }

  async function handleConfirmDelete() {
    if (!confirmTarget) return;
    const t = confirmTarget;

    setPendingId(t.id);
    setError(null);
    const result = await deleteTemplateAction(t.id, t.judul);
    setPendingId(null);
    setConfirmTarget(null);

    if (!result.success) {
      setError(result.error ?? "Gagal menghapus.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {!open ? (
        <button
          type="button"
          onClick={startAdd}
          className="rounded-xl bg-admin-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          + Tambah Template Balasan
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">
              {editing ? "Edit Template" : "Template Baru"}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              Batal
            </button>
          </div>

          <div>
            <label htmlFor="judul" className="block text-xs font-medium text-slate-700">
              Judul
            </label>
            <input
              id="judul"
              name="judul"
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Mis. Ajak Bertemu Langsung"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-admin-500"
            />
          </div>

          <div>
            <label htmlFor="isi" className="block text-xs font-medium text-slate-700">
              Isi Balasan
            </label>
            <textarea
              id="isi"
              name="isi"
              required
              rows={3}
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
              placeholder="Tulis isi balasan template..."
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-admin-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-admin-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan Template"}
          </button>
        </form>
      )}

      {initial.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Belum ada template balasan.
        </p>
      ) : (
        <ul className="space-y-2">
          {initial.map((t) => (
            <li key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{t.judul}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{t.isi}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    disabled={pendingId === t.id}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmTarget(t)}
                    disabled={pendingId === t.id}
                    className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        title="Hapus template balasan?"
        description={
          confirmTarget
            ? `Hapus template "${confirmTarget.judul}"? Tindakan ini tidak bisa dibatalkan.`
            : ""
        }
        pending={pendingId === confirmTarget?.id}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
