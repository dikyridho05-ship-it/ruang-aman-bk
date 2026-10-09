"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { bukaIsiChatSekaliAction, type PesanDibuka } from "@/actions/buka-chat";
import { jamWib, tanggalWaktu } from "@/lib/waktu";

type Terbuka = { judul: string; namaSamaran: string | null; pesan: PesanDibuka[] };

/**
 * Ruang baca isi chat untuk Super Admin — sekali per curhatan.
 *
 * Isi chat hanya hidup di state komponen ini. Tidak disimpan di
 * localStorage, URL, atau cache halaman: menutup, memuat ulang, atau
 * meninggalkan halaman membuangnya, dan server menolak permintaan berikutnya.
 */
export default function BukaIsiChat({ kode }: { kode: string }) {
  const router = useRouter();
  const [alasan, setAlasan] = useState("");
  const [yakin, setYakin] = useState(false);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [isi, setIsi] = useState<Terbuka | null>(null);

  // Peringatan bawaan browser kalau Super Admin menutup tab/memuat ulang
  // saat isi chat sedang terbuka — setelah itu isinya tidak bisa dibuka lagi.
  useEffect(() => {
    if (!isi) return;
    const tahan = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", tahan);
    return () => window.removeEventListener("beforeunload", tahan);
  }, [isi]);

  async function buka(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setProses(true);
    const hasil = await bukaIsiChatSekaliAction(kode, alasan);
    setProses(false);
    if (!hasil.success) {
      setGalat(hasil.error);
      return;
    }
    setIsi({ judul: hasil.judul, namaSamaran: hasil.namaSamaran, pesan: hasil.pesan });
  }

  if (isi) {
    return (
      <section className="mt-4 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-slate-500">{kode}</p>
            <h2 className="mt-0.5 font-semibold text-slate-900">{isi.judul || "(tanpa judul)"}</h2>
            {isi.namaSamaran && (
              <p className="mt-0.5 text-sm text-slate-600">
                Nama samaran: <span className="font-semibold text-slate-800">{isi.namaSamaran}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => router.push("/curhatan")}
            className="shrink-0 rounded-xl bg-admin-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Selesai &amp; tutup
          </button>
        </div>

        <p className="border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-xs text-amber-900">
          Ini satu-satunya kesempatan membaca isi chat curhatan ini. Begitu halaman ditutup, dimuat
          ulang, atau ditinggalkan, isinya tidak bisa dibuka lagi oleh Super Admin mana pun.
        </p>

        <ol className="max-h-[65dvh] space-y-2 overflow-y-auto bg-slate-50 px-4 py-4">
          {isi.pesan.length === 0 && (
            <li className="py-8 text-center text-sm text-slate-500">Belum ada pesan di curhatan ini.</li>
          )}
          {isi.pesan.map((m) => {
            const guru = m.pengirim === "guru";
            return (
              <li key={m.id} className={`flex ${guru ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                    guru ? "bg-admin-600 text-white" : "bg-white text-slate-800 ring-1 ring-slate-200"
                  }`}
                >
                  <p className={`text-[11px] font-semibold ${guru ? "text-admin-100" : "text-slate-500"}`}>
                    {guru ? "Guru BK" : isi.namaSamaran || "Siswa"}
                  </p>
                  {m.gambar && (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL lampiran chat
                    <img src={m.gambar} alt="Lampiran gambar" className="mt-1 max-h-64 rounded-lg" />
                  )}
                  {m.isi && <p className="mt-0.5 whitespace-pre-wrap break-words">{m.isi}</p>}
                  {m.createdAtMs && (
                    <p
                      className={`mt-1 text-right text-[10px] ${guru ? "text-admin-100" : "text-slate-400"}`}
                      title={tanggalWaktu(m.createdAtMs)}
                    >
                      {jamWib(m.createdAtMs)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    );
  }

  return (
    <form onSubmit={buka} className="mt-4 space-y-5 rounded-xl bg-white p-6 ring-1 ring-slate-200">
      <div>
        <h2 className="font-semibold text-slate-900">
          Buka isi chat <span className="font-mono">{kode}</span>
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Isi chat setiap curhatan hanya bisa dibuka Super Admin <strong>satu kali</strong>. Setelah
          ruang baca ditutup, dimuat ulang, atau ditinggalkan, isinya tidak bisa dibuka lagi oleh
          Super Admin mana pun. Alasanmu tercatat di Jejak aktivitas bersama nama dan waktunya.
        </p>
      </div>

      {galat && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {galat}
        </div>
      )}

      <div>
        <label htmlFor="alasan" className="block text-sm font-medium text-slate-700">
          Alasan membuka
        </label>
        <textarea
          id="alasan"
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          rows={3}
          maxLength={300}
          required
          placeholder="Misalnya: laporan kekerasan perlu ditindaklanjuti kepala sekolah"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-admin-500 focus:ring-2 focus:ring-admin-200"
        />
        <p className="mt-1 text-xs text-slate-500">Minimal 10 karakter.</p>
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={yakin}
          onChange={(e) => setYakin(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-admin-600 focus:ring-admin-200"
        />
        Saya mengerti isi chat ini hanya bisa saya baca sekarang, satu kali.
      </label>

      <button
        type="submit"
        disabled={proses || !yakin || alasan.trim().length < 10}
        className="rounded-xl bg-admin-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {proses ? "Membuka..." : "Buka isi chat sekarang"}
      </button>
    </form>
  );
}
