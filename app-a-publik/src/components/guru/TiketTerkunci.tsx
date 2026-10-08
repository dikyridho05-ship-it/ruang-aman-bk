import Link from "next/link";
import { tanggalPanjang, jamSekolah } from "@/lib/waktu";
import { labelKategori, type KategoriCurhat } from "@/types/ticket";

/**
 * Pengganti ruang chat saat Guru BK membuka (lewat tautan langsung atau
 * daftar) curhatan yang bukan miliknya. Hanya menampilkan data yang memang
 * boleh diketahui semua Guru BK — tidak ada judul, tidak ada isi.
 */
export default function TiketTerkunci({
  kode,
  kategori,
  createdAtMs,
  namaGuru,
}: {
  kode: string;
  kategori: KategoriCurhat[];
  createdAtMs: number;
  /** null = belum ditugaskan ke siapa pun. */
  namaGuru: string | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-dashed border-slate-300 bg-white/70">
      <div className="p-3 lg:hidden">
        <Link
          href="/guru"
          aria-label="Kembali ke daftar curhatan"
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span aria-hidden className="text-lg leading-none">
            &larr;
          </span>
        </Link>
      </div>

      <div className="m-auto flex max-w-sm flex-col items-center p-8 text-center">
        <span className="text-4xl" aria-hidden>
          🔒
        </span>
        <p className="mt-3 text-sm font-bold text-slate-700">
          {namaGuru ? `Curhatan ini ditangani ${namaGuru}` : "Curhatan ini belum ditugaskan"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {namaGuru
            ? "Hanya Guru BK yang ditugaskan yang bisa membaca dan membalasnya. Kalau penanganannya perlu dipindahkan kepadamu, minta Super Admin mengubah penugasan."
            : "Isi curhatan baru bisa dibuka setelah Super Admin menugaskannya ke salah satu Guru BK. Kalau ini mendesak, hubungi Super Admin sekolah."}
        </p>
        <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-[11px] text-slate-500">
          <span className="font-mono font-semibold text-slate-700">{kode}</span> &middot;{" "}
          {labelKategori(kategori)} &middot; {tanggalPanjang(createdAtMs)}, {jamSekolah(createdAtMs)}
        </p>
      </div>
    </div>
  );
}
