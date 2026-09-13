"use client";

/**
 * Modal konfirmasi App B, bergaya konsisten dengan modal darurat App A
 * (EmergencyButton.tsx): overlay `bg-black/50` + panel `rounded-2xl`
 * `shadow-xl`. Menggantikan `window.confirm()` yang dipakai sebelumnya
 * di Hapus Guru BK dan Hapus Template — dialog native itu tidak bisa
 * diberi styling sama sekali, jadi terlihat "lepas" dari tampilan app.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={pending ? undefined : onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-slate-900">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="mt-1 text-sm text-slate-600">
          {description}
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex-1 rounded-xl border border-slate-300 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Menghapus..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
