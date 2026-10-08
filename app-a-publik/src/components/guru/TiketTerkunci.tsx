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
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl bg-white ring-1 ring-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5 sm:px-4">
        <Link
          href="/guru"
          aria-label="Kembali ke daftar curhatan"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <p className="font-mono text-sm text-slate-600">{kode}</p>
      </div>

      <div className="mx-auto my-auto w-full max-w-md px-6 py-12">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-kertas text-tinta" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" className="h-5 w-5">
            <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" />
            <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
          </svg>
        </span>
        <h2 className="mt-4 text-xl font-extrabold tracking-tight text-tinta">
          {namaGuru ? `Curhatan ini ditangani ${namaGuru}` : "Curhatan ini belum ditugaskan"}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
          {namaGuru
            ? "Hanya Guru BK yang ditugaskan yang bisa membaca dan membalasnya. Kalau penanganannya perlu dipindahkan kepadamu, minta Super Admin mengubah penugasan."
            : "Isi curhatan baru bisa dibuka setelah Super Admin menugaskannya ke salah satu Guru BK. Kalau ini mendesak, hubungi Super Admin sekolah."}
        </p>
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-sm">
          <dt className="text-slate-500">Kategori</dt>
          <dd className="text-slate-800">{labelKategori(kategori)}</dd>
          <dt className="text-slate-500">Masuk</dt>
          <dd className="text-slate-800">
            {tanggalPanjang(createdAtMs)}, {jamSekolah(createdAtMs)}
          </dd>
        </dl>
      </div>
    </section>
  );
}
