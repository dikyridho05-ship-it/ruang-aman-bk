"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteAllCurhatanAction,
  deleteCurhatanAction,
  tugaskanCurhatanAction,
  type CurhatanRow,
} from "@/actions/curhatan";
import { KATEGORI_CURHAT_LABEL, STATUS_LABEL, type KategoriCurhat, type TicketStatus } from "@/types/statistik";
import ConfirmDialog from "@/components/ConfirmDialog";
import { tanggalWaktu } from "@/lib/waktu";

const KATEGORI_BERISIKO: readonly KategoriCurhat[] = ["kekerasan", "kesehatan_mental"];

const STATUS_TITIK: Record<TicketStatus, string> = {
  baru: "bg-amber-500",
  dibaca: "bg-amber-300",
  dibalas: "bg-langit-500",
  selesai: "bg-emerald-500",
};

type Tab = "belum" | "semua";
type ConfirmMode = "selected" | "all" | null;

function prioritas(c: CurhatanRow): boolean {
  return c.status !== "selesai" && c.kategori.some((k) => KATEGORI_BERISIKO.includes(k));
}

/**
 * Daftar curhatan untuk Super Admin: menugaskan curhatan ke Guru BK, dan
 * menghapus. Super Admin hanya melihat kode, kategori, waktu & status —
 * judul dan isi tidak pernah dibaca App B. Itu cukup untuk menugaskan:
 * kategori menunjukkan keahlian yang dibutuhkan, waktu menunjukkan urgensi.
 */
export default function CurhatanList({
  curhatan,
  guruAktif,
}: {
  curhatan: CurhatanRow[];
  guruAktif: { uid: string; nama: string }[];
}) {
  const router = useRouter();
  const jumlahBelum = curhatan.filter((c) => !c.guruDitugaskan && c.status !== "selesai").length;
  const [tab, setTab] = useState<Tab>(jumlahBelum > 0 ? "belum" : "semua");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tujuan, setTujuan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [sibuk, startTransition] = useTransition();
  const [barisSibuk, setBarisSibuk] = useState<string | null>(null);

  const aktifUid = useMemo(() => new Set(guruAktif.map((g) => g.uid)), [guruAktif]);

  const terlihat = useMemo(() => {
    const daftar = tab === "belum" ? curhatan.filter((c) => !c.guruDitugaskan && c.status !== "selesai") : curhatan;
    return [...daftar].sort((a, b) => {
      const pa = prioritas(a), pb = prioritas(b);
      if (pa !== pb) return pa ? -1 : 1;
      return (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);
    });
  }, [curhatan, tab]);

  const semuaTerpilih = terlihat.length > 0 && terlihat.every((c) => selected.has(c.kode));

  function toggleSatu(kode: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kode)) next.delete(kode);
      else next.add(kode);
      return next;
    });
  }

  function toggleSemua() {
    setSelected(semuaTerpilih ? new Set() : new Set(terlihat.map((c) => c.kode)));
  }

  function tugaskan(kodeList: string[], guruUid: string | null, kodeBaris?: string) {
    setError(null);
    setInfo(null);
    setBarisSibuk(kodeBaris ?? null);
    startTransition(async () => {
      const h = await tugaskanCurhatanAction(kodeList, guruUid);
      setBarisSibuk(null);
      if (!h.success) {
        setError(h.error);
        return;
      }
      const nama = guruAktif.find((g) => g.uid === guruUid)?.nama;
      setInfo(
        guruUid
          ? `${h.jumlah} curhatan ditugaskan ke ${nama}. Hanya ${nama} yang sekarang bisa membukanya.`
          : `Penugasan ${h.jumlah} curhatan dilepas. Curhatan itu terkunci untuk semua Guru BK.`,
      );
      setSelected(new Set());
      setTujuan("");
      router.refresh();
    });
  }

  async function handleConfirmDelete() {
    setMenghapus(true);
    setError(null);
    const result =
      confirmMode === "all" ? await deleteAllCurhatanAction() : await deleteCurhatanAction(Array.from(selected));
    setMenghapus(false);
    setConfirmMode(null);
    if (!result.success) {
      setError(result.error ?? "Gagal menghapus curhatan.");
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  const deskripsiKonfirmasi =
    confirmMode === "all"
      ? `Hapus SEMUA ${curhatan.length} curhatan beserta seluruh riwayat chat-nya? Tindakan ini tidak bisa dibatalkan.`
      : `Hapus ${selected.size} curhatan terpilih beserta riwayat chat-nya? Tindakan ini tidak bisa dibatalkan.`;

  if (curhatan.length === 0) {
    return (
      <p className="rounded-xl bg-white px-5 py-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">
        Belum ada curhatan masuk.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Saring curhatan" className="flex gap-1 border-b border-slate-200">
        {(
          [
            { id: "belum", label: "Belum ditugaskan", n: jumlahBelum },
            { id: "semua", label: "Semua", n: curhatan.length },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setSelected(new Set());
            }}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold ${
              tab === t.id ? "border-admin-800 text-admin-900" : "border-transparent text-slate-500 hover:text-admin-800"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 text-xs leading-5 ${
                t.id === "belum" && t.n > 0 ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              {t.n}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border-l-4 border-red-500 bg-red-50 px-3.5 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="rounded-lg border-l-4 border-emerald-500 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900">
          {info}
        </p>
      )}
      {guruAktif.length === 0 && (
        <p className="rounded-lg border-l-4 border-amber-500 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
          Belum ada akun Guru BK aktif. Tambahkan dulu di menu Akun Guru BK supaya curhatan bisa ditugaskan.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={semuaTerpilih} onChange={toggleSemua} className="h-4 w-4 rounded border-slate-300 accent-admin-700" />
          {selected.size > 0 ? `${selected.size} dipilih` : "Pilih semua"}
        </label>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <label htmlFor="tujuan-massal" className="sr-only">
            Guru BK tujuan
          </label>
          <select
            id="tujuan-massal"
            value={tujuan}
            onChange={(e) => setTujuan(e.target.value)}
            disabled={selected.size === 0 || sibuk}
            className="min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="">Tugaskan ke…</option>
            {guruAktif.map((g) => (
              <option key={g.uid} value={g.uid}>
                {g.nama}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={selected.size === 0 || !tujuan || sibuk}
            onClick={() => tugaskan(Array.from(selected), tujuan)}
            className="rounded-lg bg-admin-800 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-admin-900 disabled:opacity-40"
          >
            Tugaskan
          </button>
          <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" aria-hidden />
          <button
            type="button"
            onClick={() => setConfirmMode("selected")}
            disabled={selected.size === 0 || menghapus}
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
          >
            Hapus
          </button>
          <button
            type="button"
            onClick={() => setConfirmMode("all")}
            disabled={menghapus}
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-red-700"
          >
            Hapus semua
          </button>
        </div>
      </div>

      {terlihat.length === 0 ? (
        <p className="rounded-xl bg-white px-5 py-8 text-center text-sm text-slate-600 ring-1 ring-slate-200">
          Semua curhatan sudah ditugaskan ke Guru BK.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          {terlihat.map((c) => {
            const dipilih = selected.has(c.kode);
            const pr = prioritas(c);
            const guruNonaktif = c.guruDitugaskan && !aktifUid.has(c.guruDitugaskan.uid);
            return (
              <li
                key={c.kode}
                className={`relative flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 ${dipilih ? "bg-admin-50" : ""}`}
              >
                {pr && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-red-500" />}
                <input
                  type="checkbox"
                  checked={dipilih}
                  onChange={() => toggleSatu(c.kode)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 accent-admin-700"
                  aria-label={`Pilih ${c.kode}`}
                />
                <div className="min-w-0 flex-1 basis-56">
                  <p className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-admin-900">{c.kode}</span>
                    {pr && <span className="text-xs font-semibold text-red-700">prioritas</span>}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-slate-600">
                    {c.kategori.length > 0 ? c.kategori.map((k) => KATEGORI_CURHAT_LABEL[k]).join(", ") : "Tanpa kategori"}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                    {c.status && <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${STATUS_TITIK[c.status]}`} />}
                    {c.status ? STATUS_LABEL[c.status] : "Status tidak diketahui"}
                    {c.createdAtMs ? `, masuk ${tanggalWaktu(c.createdAtMs)}` : ""}
                  </p>
                  {c.dibukaAdmin ? (
                    <Link
                      href={`/curhatan/${c.kode}`}
                      className="mt-1 inline-block text-xs text-slate-500 underline-offset-2 hover:underline"
                    >
                      Isi chat sudah dibuka {c.dibukaAdmin.nama}
                      {c.dibukaAdmin.waktuMs ? `, ${tanggalWaktu(c.dibukaAdmin.waktuMs)}` : ""}
                    </Link>
                  ) : (
                    <Link
                      href={`/curhatan/${c.kode}`}
                      className="mt-1 inline-block text-xs font-semibold text-admin-700 underline-offset-2 hover:underline"
                    >
                      Lihat isi chat (sekali)
                    </Link>
                  )}
                </div>

                <div className="w-full sm:w-56">
                  <label htmlFor={`guru-${c.kode}`} className="block text-xs text-slate-500">
                    Ditangani oleh
                  </label>
                  <select
                    id={`guru-${c.kode}`}
                    value={c.guruDitugaskan?.uid ?? ""}
                    disabled={sibuk || guruAktif.length === 0}
                    onChange={(e) => tugaskan([c.kode], e.target.value || null, c.kode)}
                    className={`mt-0.5 w-full rounded-lg border px-2.5 py-1.5 text-sm disabled:opacity-60 ${
                      c.guruDitugaskan
                        ? guruNonaktif
                          ? "border-amber-400 bg-amber-50 text-amber-900"
                          : "border-slate-300 bg-white text-slate-800"
                        : "border-amber-400 bg-white font-semibold text-amber-800"
                    }`}
                  >
                    <option value="">{c.guruDitugaskan ? "Lepas penugasan" : "Belum ditugaskan"}</option>
                    {guruNonaktif && c.guruDitugaskan && (
                      <option value={c.guruDitugaskan.uid} disabled>
                        {c.guruDitugaskan.nama} (nonaktif)
                      </option>
                    )}
                    {guruAktif.map((g) => (
                      <option key={g.uid} value={g.uid}>
                        {g.nama}
                      </option>
                    ))}
                  </select>
                  {barisSibuk === c.kode && <p className="mt-1 text-xs text-slate-500">Menyimpan…</p>}
                  {guruNonaktif && (
                    <p className="mt-1 text-xs text-amber-800">Akun guru ini nonaktif. Pindahkan ke guru lain.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmMode !== null}
        title={confirmMode === "all" ? "Hapus semua curhatan?" : "Hapus curhatan terpilih?"}
        description={deskripsiKonfirmasi}
        pending={menghapus}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmMode(null)}
      />
    </div>
  );
}
